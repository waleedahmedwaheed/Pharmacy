import { OdooConfig, Appointment, Patient, GovPrescription } from '../types';

export interface OdooProduct {
  id: number;
  name: string;
  default_code: string;
  qty_available: number;
  list_price: number;
  standard_price?: number;
  active?: boolean;
}

export interface OdooPartner {
  id: number;
  name: string;
  ref: string;
  email?: string;
  phone?: string;
  comment?: string;
}

const STANDARD_VAS_PRICES: Record<string, number> = {
  'smoking': 100,
  'mms': 100,
  'chronic': 100,
  'oral': 100
};

class OdooService {
  private config: OdooConfig = {
    url: 'https://a21inventory.odoo.com',
    db: 'a21inventory',
    username: 'mtsui@app2one.com',
    apiKey: 'da4052cdf828352c98db6b12969dc3c397864fa4',
    proxyUrl: 'https://proxy.stg.jiralog.com/jsonrpc',
    connected: false
  };
  private uid: number | null = null;

  setConfig(config: OdooConfig) {
    this.config = config;
    this.uid = null;
  }

  private formatOdooDatetime(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  private async jsonRpcCall(service: 'common' | 'object', method: string, args: any[]) {
    if (!this.config.proxyUrl) throw new Error("Proxy URL is missing.");
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Math.floor(Math.random() * 1000)
    };
    const response = await fetch(this.config.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors'
    });
    if (!response.ok) throw new Error(`Proxy error ${response.status}`);
    const json = await response.json();
    if (json.error) throw new Error(json.error.data?.message || json.error.message || "Odoo Error");
    return json.result;
  }

  async authenticate(): Promise<number> {
    const uid = await this.jsonRpcCall('common', 'authenticate', [this.config.db, this.config.username, this.config.apiKey, {}]);
    if (!uid || typeof uid !== 'number') throw new Error("Authentication failed.");
    this.uid = uid;
    return uid;
  }

  async execute(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    if (!this.uid) await this.authenticate();
    return await this.jsonRpcCall('object', 'execute_kw', [this.config.db, this.uid, this.config.apiKey, model, method, args, kwargs]);
  }

  async syncLead(rx: Partial<GovPrescription>, patient: Patient): Promise<number> {
    const partnerId = await this.pushPartner(patient);
    return await this.execute('crm.lead', 'create', [{
      name: `Dispense: ${rx.id || 'New Rx'}`,
      partner_id: partnerId,
      contact_name: patient.name,
      description: `Medications: ${rx.medications?.join(', ') || 'N/A'}\nSource: ${rx.hospital || 'Gov Platform'}`,
      type: 'opportunity', 
      priority: '2',
      user_id: this.uid
    }]);
  }

  async syncSalesOrder(appt: Appointment, patient: Patient): Promise<number> {
    const partnerId = await this.pushPartner(patient);
    const pricelists = await this.execute('product.pricelist', 'search', [[]], { limit: 1 });
    const pricelistId = pricelists && pricelists.length > 0 ? pricelists[0] : false;

    const orderLines: any[] = [];
    if (appt.prescription) {
      const allActive = await this.execute('product.product', 'search', [[['active', '=', true]]], { limit: 1 });
      const fallbackId = allActive && allActive.length > 0 ? allActive[0] : false;

      for (const med of appt.prescription.medications) {
        const keyword = med.name.split(' ')[0];
        const products = await this.execute('product.product', 'search', [[['name', 'ilike', keyword]]], { limit: 1 });
        const productId = (products && products.length > 0) ? products[0] : fallbackId;
        
        if (productId) {
          orderLines.push([0, 0, {
            product_id: productId,
            name: med.name,
            product_uom_qty: 1,
            price_unit: 20.00 
          }]);
        }
      }
    }

    if (orderLines.length === 0) throw new Error("Sales Order requires at least one product.");

    return await this.execute('sale.order', 'create', [{
      partner_id: partnerId,
      pricelist_id: pricelistId,
      origin: appt.id,
      order_line: orderLines
    }]);
  }

  async syncPOSOrder(appt: Appointment, patient: Patient, total: number): Promise<number> {
    const partnerId = await this.pushPartner(patient);
    
    const sessions = await this.execute('pos.session', 'search', [[['state', '=', 'opened']]], { limit: 1 });
    if (!sessions || sessions.length === 0) {
       throw new Error("No open Odoo POS session found. Please open a session in Odoo first.");
    }
    const sessionId = sessions[0];

    const medProdSearch = await this.execute('product.product', 'search', [[['name', 'ilike', 'Medicine'], ['active', '=', true]]], { limit: 1 });
    const svcProdSearch = await this.execute('product.product', 'search', [[['name', 'ilike', 'Service'], ['active', '=', true]]], { limit: 1 });
    const allNonTip = await this.execute('product.product', 'search', [[['active', '=', true], ['name', 'not ilike', 'Tips']]], { limit: 1 });
    
    const medBaseId = medProdSearch?.[0] || allNonTip?.[0];
    const svcBaseId = svcProdSearch?.[0] || allNonTip?.[0];

    const orderLines: any[] = [];

    const medCoPay = appt.coPaymentAmount || 140.0;
    orderLines.push([0, 0, {
      product_id: medBaseId,
      qty: 1,
      price_unit: medCoPay,
      price_subtotal: medCoPay,
      price_subtotal_incl: medCoPay,
      name: "Medication Net Co-pay",
      full_product_name: "Medication Net Co-pay",
    }]);

    if (appt.vasServices && appt.vasServices.length > 0) {
      for (const vasId of appt.vasServices) {
         const price = STANDARD_VAS_PRICES[vasId] ?? 100.0;
         orderLines.push([0, 0, {
           product_id: svcBaseId,
           qty: 1,
           price_unit: price,
           price_subtotal: price,
           price_subtotal_incl: price,
           name: vasId.toUpperCase(),
           full_product_name: vasId.toUpperCase(),
         }]);
      }
    }

    const posOrderId = await this.execute('pos.order', 'create', [{
      session_id: sessionId,
      partner_id: partnerId,
      lines: orderLines,
      amount_total: total,
      amount_tax: 0,
      amount_paid: total,
      amount_return: 0,
      pos_reference: `CPP-${appt.id}-${Date.now()}`
    }]);

    const paymentMethods = await this.execute('pos.payment.method', 'search', [[]], { limit: 1 });
    if (paymentMethods && paymentMethods.length > 0) {
        await this.execute('pos.payment', 'create', [{
            pos_order_id: posOrderId,
            amount: total,
            payment_method_id: paymentMethods[0],
            payment_date: this.formatOdooDatetime(new Date())
        }]);
    }

    return posOrderId;
  }

  async syncInvoice(appt: Appointment, patient: Patient): Promise<number> {
    const partnerId = await this.pushPartner(patient);
    const invoiceLines: any[] = [];

    if (appt.prescription) {
      for (const med of appt.prescription.medications) {
        const products = await this.execute('product.product', 'search', [[['name', 'ilike', med.name.split(' ')[0]]]], { limit: 1 });
        const productId = products && products.length > 0 ? products[0] : false;
        
        invoiceLines.push([0, 0, {
          product_id: productId || false,
          name: med.name,
          quantity: 1,
          price_unit: 20.0,
          account_id: false 
        }]);
      }
    }

    const invoiceId = await this.execute('account.move', 'create', [{
      move_type: 'out_invoice',
      partner_id: partnerId,
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_line_ids: invoiceLines
    }]);

    try {
      await this.execute('account.move', 'action_post', [[invoiceId]]);
    } catch (e) {
      console.warn("Manual posting required for invoice:", invoiceId);
    }
    return invoiceId;
  }

  async pushPartner(patient: Patient): Promise<number> {
    const existing = await this.execute('res.partner', 'search', [[['ref', '=', patient.hkid]]]);
    const data = { 
      name: patient.name, 
      ref: patient.hkid, 
      is_company: false,
      customer_rank: 1,
      opportunity_count: 1
    };
    if (existing?.length) {
      await this.execute('res.partner', 'write', [[existing[0]], data]);
      return existing[0];
    }
    return await this.execute('res.partner', 'create', [data]);
  }

  async fetchInventory(): Promise<OdooProduct[]> {
    return await this.execute('product.product', 'search_read', [[['active', '=', true]], ['id', 'name', 'default_code', 'qty_available', 'list_price']]);
  }

  async pushStockUpdate(productId: number, newQuantity: number): Promise<boolean> {
    const locationIds = await this.execute('stock.location', 'search', [[['usage', '=', 'internal']]]);
    if (!locationIds?.length) throw new Error("No internal location.");
    const locationId = locationIds[0];
    const quantIds = await this.execute('stock.quant', 'search', [[['product_id', '=', productId], ['location_id', '=', locationId]]]);
    let qId: number;
    if (quantIds?.length) {
      qId = quantIds[0];
      await this.execute('stock.quant', 'write', [[qId], { inventory_quantity: newQuantity }]);
    } else {
      qId = await this.execute('stock.quant', 'create', [{ product_id: productId, location_id: locationId, inventory_quantity: newQuantity }]);
    }
    await this.execute('stock.quant', 'action_apply_inventory', [[qId]]);
    return true;
  }

  async pushProduct(data: Partial<OdooProduct>): Promise<number> {
    if (data.id) {
      const { id, ...rest } = data;
      await this.execute('product.product', 'write', [[id], rest]);
      return id;
    }
    return await this.execute('product.product', 'create', [{ ...data, type: 'product' }]);
  }
}

export const odooService = new OdooService();