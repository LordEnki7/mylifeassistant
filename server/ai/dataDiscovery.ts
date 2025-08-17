// Intelligent Data Discovery Service
// Sunshine's ability to find and connect data across all systems

import { storage } from '../storage';

export interface DiscoveryResult {
  source: string;
  type: 'task' | 'contact' | 'grant' | 'invoice' | 'message' | 'external';
  data: any;
  relevance: number;
  connections?: string[];
}

export class DataDiscoveryService {
  async discoverData(
    topic: string, 
    userId: string, 
    dataTypes: string[] = ['all']
  ): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    // Search across all internal systems
    if (dataTypes.includes('all') || dataTypes.includes('tasks')) {
      const taskResults = await this.searchTasks(topic, userId);
      results.push(...taskResults);
    }
    
    if (dataTypes.includes('all') || dataTypes.includes('contacts')) {
      const contactResults = await this.searchContacts(topic, userId);
      results.push(...contactResults);
    }
    
    if (dataTypes.includes('all') || dataTypes.includes('grants')) {
      const grantResults = await this.searchGrants(topic, userId);
      results.push(...grantResults);
    }
    
    if (dataTypes.includes('all') || dataTypes.includes('messages')) {
      const messageResults = await this.searchMessages(topic, userId);
      results.push(...messageResults);
    }
    
    // Find cross-system connections
    this.identifyConnections(results);
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  private async searchTasks(topic: string, userId: string): Promise<DiscoveryResult[]> {
    const tasks = await storage.getTasks(userId);
    const results: DiscoveryResult[] = [];
    
    for (const task of tasks) {
      const relevance = this.calculateRelevance(topic, [
        task.title,
        task.description,
        task.category
      ].filter(Boolean));
      
      if (relevance > 0.3) {
        results.push({
          source: 'tasks',
          type: 'task',
          data: task,
          relevance,
          connections: this.findTaskConnections(task)
        });
      }
    }
    
    return results;
  }

  private async searchContacts(topic: string, userId: string): Promise<DiscoveryResult[]> {
    const contacts = await storage.getContacts(userId);
    const results: DiscoveryResult[] = [];
    
    for (const contact of contacts) {
      const relevance = this.calculateRelevance(topic, [
        contact.name,
        contact.company,
        contact.role,
        contact.notes
      ].filter(Boolean));
      
      if (relevance > 0.3) {
        results.push({
          source: 'contacts',
          type: 'contact',
          data: contact,
          relevance,
          connections: this.findContactConnections(contact)
        });
      }
    }
    
    return results;
  }

  private async searchGrants(topic: string, userId: string): Promise<DiscoveryResult[]> {
    const grants = await storage.getGrants(userId);
    const results: DiscoveryResult[] = [];
    
    for (const grant of grants) {
      const relevance = this.calculateRelevance(topic, [
        grant.title,
        grant.organization,
        grant.description,
        grant.focus?.join(' ')
      ].filter(Boolean));
      
      if (relevance > 0.3) {
        results.push({
          source: 'grants',
          type: 'grant',
          data: grant,
          relevance,
          connections: this.findGrantConnections(grant)
        });
      }
    }
    
    return results;
  }

  private async searchMessages(topic: string, userId: string): Promise<DiscoveryResult[]> {
    const messages = await storage.getChatMessages(userId);
    const results: DiscoveryResult[] = [];
    
    for (const message of messages.slice(-50)) { // Last 50 messages
      const relevance = this.calculateRelevance(topic, [
        message.message,
        message.response
      ].filter(Boolean));
      
      if (relevance > 0.4) {
        results.push({
          source: 'messages',
          type: 'message',
          data: message,
          relevance
        });
      }
    }
    
    return results;
  }

  private calculateRelevance(topic: string, texts: string[]): number {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const allText = texts.join(' ').toLowerCase();
    
    let score = 0;
    let totalWords = topicWords.length;
    
    for (const word of topicWords) {
      if (word.length < 3) continue; // Skip short words
      
      if (allText.includes(word)) {
        score += 1;
        
        // Bonus for exact phrase matches
        if (allText.includes(topic.toLowerCase())) {
          score += 0.5;
        }
      }
    }
    
    return Math.min(score / totalWords, 1.0);
  }

  private findTaskConnections(task: any): string[] {
    const connections = [];
    
    // Check for C.A.R.E.N. project connections
    if (this.isCarenRelated(task.title + ' ' + task.description)) {
      connections.push('caren_project');
    }
    
    // Check for funding/grant connections
    if (this.isFundingRelated(task.title + ' ' + task.description)) {
      connections.push('funding_opportunities');
    }
    
    return connections;
  }

  private findContactConnections(contact: any): string[] {
    const connections = [];
    
    // Check if contact is investor/funder
    if (this.isInvestorContact(contact)) {
      connections.push('funding_network');
    }
    
    // Check if contact is legal/tech related
    if (this.isLegalTechContact(contact)) {
      connections.push('legal_technology');
    }
    
    return connections;
  }

  private findGrantConnections(grant: any): string[] {
    const connections = [];
    
    // Check alignment with C.A.R.E.N.
    if (this.isCarenAligned(grant)) {
      connections.push('caren_funding');
    }
    
    return connections;
  }

  private identifyConnections(results: DiscoveryResult[]): void {
    // Cross-reference results to find additional connections
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const connection = this.findCrossConnection(results[i], results[j]);
        if (connection) {
          results[i].connections = [...(results[i].connections || []), connection];
          results[j].connections = [...(results[j].connections || []), connection];
        }
      }
    }
  }

  private findCrossConnection(result1: DiscoveryResult, result2: DiscoveryResult): string | null {
    // Example: Task about grant application + Grant record = "application_pipeline"
    if (result1.type === 'task' && result2.type === 'grant') {
      if (result1.data.title?.toLowerCase().includes('grant') || 
          result1.data.description?.toLowerCase().includes(result2.data.organization?.toLowerCase())) {
        return 'application_pipeline';
      }
    }
    
    // Example: Contact at organization + Grant from same organization = "direct_contact"
    if (result1.type === 'contact' && result2.type === 'grant') {
      if (result1.data.company?.toLowerCase() === result2.data.organization?.toLowerCase()) {
        return 'direct_contact';
      }
    }
    
    return null;
  }

  private isCarenRelated(text: string): boolean {
    const carenKeywords = ['caren', 'roadside', 'emergency', 'navigation', 'digital witness', 'traffic stop'];
    return carenKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isFundingRelated(text: string): boolean {
    const fundingKeywords = ['grant', 'funding', 'investment', 'money', 'capital', 'seed', 'angel'];
    return fundingKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isInvestorContact(contact: any): boolean {
    const investorRoles = ['investor', 'vc', 'venture', 'capital', 'fund', 'angel'];
    const text = (contact.role + ' ' + contact.company + ' ' + contact.notes).toLowerCase();
    return investorRoles.some(role => text.includes(role));
  }

  private isLegalTechContact(contact: any): boolean {
    const legalTechKeywords = ['legal', 'tech', 'law', 'attorney', 'lawyer', 'legal tech'];
    const text = (contact.role + ' ' + contact.company + ' ' + contact.notes).toLowerCase();
    return legalTechKeywords.some(keyword => text.includes(keyword));
  }

  private isCarenAligned(grant: any): boolean {
    const carenFocus = ['legal_technology', 'ai_safety', 'public_safety', 'civil_rights', 'transportation_safety'];
    return grant.focus?.some((focus: string) => carenFocus.includes(focus)) || false;
  }

  // External data discovery suggestions
  async suggestExternalSources(topic: string): Promise<string[]> {
    const suggestions = [];
    
    if (this.isCarenRelated(topic)) {
      suggestions.push(
        "Check C.A.R.E.N. business plan documents for detailed specifications",
        "Review investor network PDFs for relevant contacts",
        "Search LegalTech Fund documentation for similar projects"
      );
    }
    
    if (this.isFundingRelated(topic)) {
      suggestions.push(
        "Search grants.gov for federal opportunities",
        "Check foundation directory for private grants",
        "Review Ohio angel investor networks"
      );
    }
    
    return suggestions;
  }
}

export const dataDiscoveryService = new DataDiscoveryService();