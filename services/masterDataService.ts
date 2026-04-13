
import { MasterDirection, MasterDrug } from '../types';
import { MASTER_DIRECTIONS, MASTER_DRUGS } from '../mockData';

class MasterDataService {
  private directions: MasterDirection[] = [...MASTER_DIRECTIONS];
  private drugs: MasterDrug[] = [...MASTER_DRUGS];

  getDirections(): MasterDirection[] {
    return this.directions;
  }

  updateDirectionOverride(code: string, customTranslation: string | undefined) {
    this.directions = this.directions.map(d => 
      d.code === code ? { ...d, customTranslation } : d
    );
  }

  /**
   * Translates a clinical Sig code into readable text.
   * Handles placeholders like {qty}.
   */
  lookupDirection(text: string, qty: string = '1', lang: 'en' | 'cn' = 'en'): string {
    const cleanText = text.trim().toUpperCase();
    
    // Try matching both the raw code and the underscored variant
    const found = this.directions.find(d => 
        d.code === cleanText || 
        d.code === `_${cleanText}` || 
        (cleanText.startsWith('_') && d.code === cleanText.substring(1))
    );
    
    if (found) {
      const template = lang === 'cn' 
        ? (found.translationCn || found.translation)
        : (found.customTranslation || found.translation);
      return template.replace('{qty}', qty);
    }
    
    return text;
  }

  getDrugs(): MasterDrug[] {
    return this.drugs;
  }

  updateDrugOverride(name: string, customStrength: string | undefined) {
    this.drugs = this.drugs.map(d => 
      d.name === name ? { ...d, customStrength } : d
    );
  }

  searchDrugs(query: string): MasterDrug[] {
    const q = query.toLowerCase();
    return this.drugs.filter(d => 
      d.name.toLowerCase().includes(q)
    );
  }
  
  getDrugSpec(name: string): string {
      const found = this.drugs.find(d => d.name === name);
      if (found) {
          return found.customStrength || found.strength;
      }
      return 'N/A';
  }
}

export const masterDataService = new MasterDataService();
