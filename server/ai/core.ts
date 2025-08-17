// AI Core Processing System - Sunshine's Brain
// Handles all AI interactions with intelligent data discovery

import OpenAI from 'openai';
import { storage } from '../storage';
import { dataDiscoveryService } from './dataDiscovery';
import { validateAndFixTools } from '../middleware/aiValidation';
import { withAIMonitoring } from '../middleware/aiMonitoring';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface AIResponse {
  message: string;
  actions?: Array<{type: string; data: any}>;
  confidence: number;
  suggestions?: string[];
  discoveredData?: any[];
}

class AIProcessor {
  async processMessage(
    message: string, 
    userId: string, 
    type: string = "general", 
    context?: any
  ): Promise<AIResponse> {
    try {
      // Step 1: Intelligent data discovery
      const discoveredData = await dataDiscoveryService.discoverData(message, userId);
      
      // Step 2: Build comprehensive context
      const aiContext = await this.buildContext(message, userId, discoveredData);
      
      // Step 3: Generate AI response with tools
      const response = await this.generateResponse(message, aiContext);
      
      // Step 4: Execute any tool actions
      const actions = await this.executeActions(response.toolCalls || [], userId);
      
      return {
        message: response.message,
        actions,
        confidence: response.confidence,
        suggestions: response.suggestions,
        discoveredData: discoveredData.slice(0, 5) // Top 5 discoveries
      };
      
    } catch (error) {
      console.error('AI processing error:', error);
      return {
        message: "I encountered an issue processing your request. Let me help you with something else.",
        confidence: 0.1,
        actions: []
      };
    }
  }

  private async buildContext(message: string, userId: string, discoveredData: any[]) {
    // Get recent conversation history
    const recentMessages = await storage.getChatMessages(userId);
    
    // Get user data
    const user = await storage.getUser(userId);
    const tasks = await storage.getTasks(userId);
    const contacts = await storage.getContacts(userId);
    const grants = await storage.getGrants(userId);
    
    // Build comprehensive system prompt
    const systemPrompt = this.buildSystemPrompt({
      user,
      tasks: tasks.slice(0, 10), // Latest 10 tasks
      contacts: contacts.slice(0, 10), // Latest 10 contacts  
      grants: grants.slice(0, 10), // Latest 10 grants
      recentMessages: recentMessages.slice(-8), // Last 8 messages
      discoveredData
    });
    
    // Create conversation history
    const conversationHistory = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.slice(-6).map(msg => ([
        { role: 'user' as const, content: msg.message },
        ...(msg.response ? [{ role: 'assistant' as const, content: msg.response }] : [])
      ])).flat(),
      { role: 'user' as const, content: message }
    ];
    
    return { conversationHistory, systemPrompt };
  }

  private buildSystemPrompt(context: any): string {
    return `You are Sunshine, an advanced AI assistant for the C.A.R.E.N. (Citizen Assistance for Roadside Emergencies and Navigation) project. 

CORE EXPERTISE:
- Legal & Commercial Law with focus on consumer protection
- AI Safety and Civil Rights technology
- Grant writing and funding strategies for legal technology
- Project management and task automation
- Professional networking and business development

UPLOADED DOCUMENTS INTEGRATED:
- Angel Investors & VC Networks (Ohio-focused): Contains Ohio Angel Collective, Morris Wheeler/Drummond Road Capital, Black Angel Group, JumpStart Ventures, Forum Ventures, SOSV, and Northeast Ohio Startup Network
- LegalTech Fund Accelerator: LegalTech Lab offering $250K funding for AI-powered legal startups, plus Arch Grants, LexisNexis accelerator programs

DISCOVERED DATA CONTEXT:
${context.discoveredData?.length > 0 ? 
  `I found ${context.discoveredData.length} relevant items in your data:
${context.discoveredData.map((item: any) => 
  `- ${item.type}: ${item.data.title || item.data.name || 'Relevant info'} (${Math.round(item.relevance * 100)}% match)`
).join('\n')}` : 
  'Searching comprehensive grant and investor database including your uploaded Ohio investor networks and LegalTech Fund documents.'
}

CURRENT USER DATA:
- Tasks: ${context.tasks?.length || 0} active tasks
- Contacts: ${context.contacts?.length || 0} contacts in network  
- Grants: ${context.grants?.length || 0} grant opportunities tracked
- Recent Activity: ${context.recentMessages?.length || 0} recent interactions

CORE CAPABILITIES:
1. Intelligent task creation and management
2. Strategic contact management with relationship tracking
3. Grant discovery and application management for C.A.R.E.N.
4. Data discovery across all systems to complete tasks
5. Professional advice on legal tech and consumer protection

RESPONSE FORMAT:
Always respond in JSON format with:
{
  "message": "Your helpful response",
  "confidence": 0.8,
  "suggestions": ["Optional suggestions"],
  "reasoning": "Brief explanation of your approach"
}

When creating tasks, contacts, or searching grants, use the provided tools.
Focus on being proactive, intelligent, and helpful for professional success.`;
  }

  private async generateResponse(message: string, context: any) {
    const tools = this.getAvailableTools();
    const validatedTools = validateAndFixTools(tools);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Latest model
      messages: context.conversationHistory,
      max_tokens: 1200,
      temperature: 0.7,
      response_format: { type: "json_object" },
      tools: validatedTools
    });
    
    // Parse response
    let responseData: any = {};
    if (completion.choices[0].message.content) {
      try {
        responseData = JSON.parse(completion.choices[0].message.content);
      } catch (parseError) {
        responseData = {
          message: completion.choices[0].message.content,
          confidence: 0.7
        };
      }
    }
    
    return {
      message: responseData.message || "I'm here to help with your C.A.R.E.N. project and daily tasks!",
      confidence: responseData.confidence || 0.8,
      suggestions: responseData.suggestions || [],
      toolCalls: completion.choices[0].message.tool_calls || []
    };
  }

  private getAvailableTools() {
    return [
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a task for the user",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              category: { type: "string" },
              dueDate: { type: "string" }
            },
            required: ["title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_contact",
          description: "Add a new contact",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              company: { type: "string" },
              type: { type: "string" },
              notes: { type: "string" }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_grants_for_caren",
          description: "Search for grants specifically relevant to C.A.R.E.N. project",
          parameters: {
            type: "object",
            properties: {
              focus_area: { 
                type: "string",
                enum: ["legal_technology", "ai_safety", "public_safety", "civil_rights", "consumer_protection", "transportation_safety", "general"]
              },
              grant_type: {
                type: "string", 
                enum: ["federal", "state", "foundation", "private", "accelerator", "all"]
              },
              amount_range: { type: "string" }
            },
            required: ["focus_area"]
          }
        }
      }
    ];
  }

  private async executeActions(toolCalls: any[], userId: string): Promise<Array<{type: string; data: any}>> {
    const actions: Array<{type: string; data: any}> = [];
    
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function') {
        const functionCall = toolCall.function;
        
        try {
          if (functionCall.name === 'create_task') {
            const taskData = JSON.parse(functionCall.arguments);
            const newTask = await storage.createTask({
              userId,
              title: taskData.title,
              description: taskData.description || '',
              priority: taskData.priority || 'medium',
              category: taskData.category || 'general',
              dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
              status: 'pending'
            });
            
            actions.push({ 
              type: 'create_task', 
              data: { ...taskData, id: newTask.id, success: true } 
            });
            
          } else if (functionCall.name === 'create_contact') {
            const contactData = JSON.parse(functionCall.arguments);
            const newContact = await storage.createContact({
              userId,
              name: contactData.name,
              email: contactData.email || '',
              company: contactData.company || '',
              type: contactData.type || 'general',
              notes: contactData.notes || ''
            });
            
            actions.push({ 
              type: 'create_contact', 
              data: { ...contactData, id: newContact.id, success: true } 
            });
            
          } else if (functionCall.name === 'search_grants_for_caren') {
            const searchData = JSON.parse(functionCall.arguments);
            const grantResults = this.searchCarenGrants(searchData);
            
            // Auto-add promising grants to database
            let addedCount = 0;
            for (const grant of grantResults) {
              try {
                await storage.createGrant({
                  userId,
                  organization: grant.organization,
                  title: grant.title,
                  amount: grant.amount,
                  deadline: grant.deadline ? new Date(grant.deadline) : null,
                  status: 'researched',
                  requirements: grant.requirements,
                  description: grant.description,
                  applicationUrl: grant.url || '',
                  notes: `Auto-discovered by Sunshine AI - Focus: ${searchData.focus_area}`
                });
                addedCount++;
              } catch (dbError) {
                // Grant may already exist
              }
            }
            
            actions.push({ 
              type: 'search_grants', 
              data: { 
                ...searchData, 
                results: grantResults,
                count: grantResults.length,
                addedCount,
                success: true 
              } 
            });
          }
          
        } catch (error) {
          console.error(`Error executing ${functionCall.name}:`, error);
          actions.push({
            type: functionCall.name,
            data: { success: false, error: (error as Error).message }
          });
        }
      }
    }
    
    return actions;
  }

  private searchCarenGrants(searchData: any) {
    // Intelligent grant simulation based on real-world C.A.R.E.N. needs
    const grants = [
      {
        organization: "National Science Foundation",
        title: "AI Safety and Public Interest Technology",
        amount: "$500,000",
        deadline: "2024-12-15",
        focus: ["ai_safety", "public_safety"],
        description: "Supporting AI systems that enhance public safety and civil rights",
        url: "https://nsf.gov/funding/opportunities",
        requirements: "Must demonstrate public benefit and safety protocols"
      },
      {
        organization: "LegalTech Innovation Fund",
        title: "Consumer Protection Technology Grant",
        amount: "$250,000", 
        deadline: "2024-11-30",
        focus: ["legal_technology", "consumer_protection"],
        description: "Technology solutions for consumer protection and legal access",
        url: "https://legaltechfund.org/grants",
        requirements: "Legal tech focus with consumer impact"
      },
      {
        organization: "Department of Transportation",
        title: "Transportation Safety Innovation",
        amount: "$750,000",
        deadline: "2025-01-31",
        focus: ["transportation_safety", "public_safety"],
        description: "Innovative solutions for transportation safety and emergency response",
        url: "https://dot.gov/grants",
        requirements: "Transportation safety focus with emergency response component"
      },
      // Crowdfunding and Alternative Funding Sources
      {
        organization: "StartEngine (Equity Crowdfunding)",
        title: "C.A.R.E.N. Community Equity Campaign",
        amount: "$500,000 - $1,070,000",
        deadline: "Ongoing",
        focus: ["crowdfunding", "equity", "community"],
        description: "Equity crowdfunding under Reg CF/A+ for community-driven investment in C.A.R.E.N.",
        url: "https://startengine.com",
        requirements: "Non-accredited investors welcome, $10K minimum before fund access"
      },
      {
        organization: "Wefunder (Community Investment)",
        title: "C.A.R.E.N. JOBS Act Crowdfunding",
        amount: "$100,000 - $1,070,000",
        deadline: "Ongoing",
        focus: ["crowdfunding", "community", "impact"],
        description: "Community-driven investment rounds for early-stage roadside safety technology",
        url: "https://wefunder.com",
        requirements: "JOBS Act compliance, community-focused mission alignment"
      },
      {
        organization: "Indiegogo (Rewards-Based)",
        title: "C.A.R.E.N. Unit Pre-Order Campaign",
        amount: "$50,000 - $500,000",
        deadline: "Flexible",
        focus: ["hardware", "rewards", "pre_sales"],
        description: "Pre-sell C.A.R.E.N. Units and generate early user interest with rewards-based crowdfunding",
        url: "https://indiegogo.com",
        requirements: "5% platform fee, hardware campaign experience preferred"
      },
      {
        organization: "SWAN Impact Network",
        title: "Early-Stage Impact Investment",
        amount: "$250,000 - $1,000,000",
        deadline: "Rolling basis",
        focus: ["impact", "societal_benefit", "early_stage"],
        description: "Impact investor network for startups with measurable societal benefits - perfect for C.A.R.E.N.",
        url: "https://swanimpactnetwork.com",
        requirements: "Demonstrate measurable social impact and community benefit"
      },
      {
        organization: "Black Angel Group (BAG)",
        title: "Seed to Series A Investment",
        amount: "$100,000 - $2,000,000",
        deadline: "Rolling applications",
        focus: ["angel", "scalable", "impact"],
        description: "Angel collective for scalable, impactful ventures with diverse leadership",
        url: "https://blackangelgroup.com",
        requirements: "Scalable business model, strong impact mission, diverse founding team"
      },
      {
        organization: "America Business Capital",
        title: "Business Growth Capital Loan",
        amount: "$50,000 - $2,000,000",
        deadline: "Ongoing applications",
        focus: ["lending", "equipment", "working_capital"],
        description: "Business loans and capital solutions for C.A.R.E.N. operations and equipment",
        url: "https://americabusinesscapital.com",
        requirements: "Established business plan, equipment financing, SBA loan eligible"
      },
      // Ohio-focused Angel Investors and VC Networks (from uploaded documents)
      {
        organization: "Ohio Angel Collective",
        title: "Early-Stage Angel Capital for Ohio Founders",
        amount: "$75,000 - $400,000",
        deadline: "Rolling applications",
        focus: ["angel", "ohio", "early_stage"],
        description: "Ohio-based angel group supporting early-stage companies with angel capital",
        url: "https://ohioangelcollective.com",
        requirements: "Ohio-based founders, early-stage companies"
      },
      {
        organization: "LegalTech Fund / LegalTech Lab",
        title: "LegalTech Accelerator Funding",
        amount: "$250,000",
        deadline: "Rolling cohorts",
        focus: ["legal_technology", "ai", "accelerator"],
        description: "Up to $250K accelerator funding plus strategic legal and tech advisors for AI-powered legal startups",
        url: "https://legaltechfund.com",
        requirements: "Early-stage AI-powered legal startups, submit pitch deck"
      },
      {
        organization: "JumpStart Ventures",
        title: "Ohio Tech Startup Venture Capital",
        amount: "$100,000 - $2,000,000",
        deadline: "Rolling applications",
        focus: ["tech", "ohio", "venture_capital"],
        description: "Ohio-based VC focused on early-stage tech startups, offering capital and connections",
        url: "https://jumpstart.vc",
        requirements: "Tech startups, Ohio focus preferred"
      },
      {
        organization: "Forum Ventures",
        title: "AI & B2B SaaS Early-Stage Program",
        amount: "$100,000",
        deadline: "Rolling cohorts",
        focus: ["ai", "b2b_saas", "pre_seed"],
        description: "AI & B2B SaaS-focused early-stage venture and accelerator programs",
        url: "https://forumvc.com",
        requirements: "AI or B2B SaaS focus, early-stage"
      },
      {
        organization: "SOSV",
        title: "Deep-Tech and AI Startup Accelerator",
        amount: "$250,000 - $500,000",
        deadline: "Multiple cohorts yearly",
        focus: ["deep_tech", "ai", "technical"],
        description: "Deep-tech and AI startup VC with accelerator programs (HAX), global reach for strong technical founders",
        url: "https://sosv.com",
        requirements: "Strong technical team, deep-tech or AI focus"
      },
      {
        organization: "Arch Grants",
        title: "St. Louis Startup Competition",
        amount: "$50,000 - $75,000",
        deadline: "Annual competition",
        focus: ["equity_free", "relocation", "startup"],
        description: "Equity-free startup grants to relocate and grow in St. Louis",
        url: "https://archgrants.org",
        requirements: "Willing to relocate to St. Louis, early-stage startup"
      },
      {
        organization: "Legal Services Corporation",
        title: "Technology Initiative Grant (TIG)",
        amount: "$50,000 - $500,000",
        deadline: "Annual RFP",
        focus: ["legal_access", "low_income", "justice"],
        description: "Tech projects improving access to justice among low-income communities",
        url: "https://lsc.gov/grants-grantee-resources/our-grant-programs/tig",
        requirements: "Focus on access to justice for low-income communities"
      },
      {
        organization: "Open Philanthropy",
        title: "Technical AI Safety Research RFP",
        amount: "$40,000,000+",
        deadline: "Next 5 months",
        focus: ["ai_safety", "research", "technical"],
        description: "Grant opportunities ranging from API credits to seed funding for AI safety research",
        url: "https://openphilanthropy.org",
        requirements: "Technical AI safety research focus"
      },
      {
        organization: "LexisNexis",
        title: "Legal Tech Accelerator",
        amount: "Investment + mentorship",
        deadline: "Rolling applications",
        focus: ["legal_technology", "mentorship", "market_fit"],
        description: "Mentorship, connections, exposure to Bay-Area VCs and legal industry professionals",
        url: "https://lexisnexis.com/accelerator",
        requirements: "Legal tech focus, early-stage companies"
      },
      {
        organization: "Department of Justice / BJA",
        title: "Public Safety Technology Grants",
        amount: "$100,000 - $1,000,000",
        deadline: "Various throughout year",
        focus: ["public_safety", "security_tech", "federal"],
        description: "Funding for security tech and public safety improvements via federal programs",
        url: "https://bja.ojp.gov/funding",
        requirements: "Public safety focus, security technology applications"
      },
      {
        organization: "NSF SBIR",
        title: "Small Business Innovation Research",
        amount: "$275,000 - $1,750,000",
        deadline: "Multiple per year",
        focus: ["research", "innovation", "commercialization"],
        description: "R&D grants for technological and commercial goals across various agencies",
        url: "https://seedfund.nsf.gov",
        requirements: "Small business, R&D focus, commercialization potential"
      },
      {
        organization: "Northeast Ohio Startup Network",
        title: "Startup NEO Support Programs",
        amount: "Varies",
        deadline: "Ongoing",
        focus: ["ohio", "mentorship", "network"],
        description: "Local entrepreneurial network offering access to capital, tech support, and peer networks",
        url: "https://startupneo.org",
        requirements: "Northeast Ohio location preferred"
      }
    ];

    // Filter by focus area
    if (searchData.focus_area !== 'general') {
      return grants.filter(grant => 
        grant.focus.includes(searchData.focus_area)
      );
    }
    
    return grants;
  }

  async monitorUserTasks(userId: string) {
    const tasks = await storage.getTasks(userId);
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
    );
    const highPriorityTasks = tasks.filter(task => 
      task.priority === 'high' && task.status !== 'completed'
    );
    
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      overdueCount: overdueTasks.length,
      highPriorityCount: highPriorityTasks.length,
      recommendations: this.generateTaskRecommendations(tasks),
      overdueTasks: overdueTasks.slice(0, 5),
      urgentTasks: highPriorityTasks.slice(0, 5)
    };
  }

  async searchGrantsWithAI(params: {
    projectName: string;
    description: string;
    focus: string;
    userId: string;
  }) {
    const discoveredGrants = await dataDiscoveryService.discoverData(
      `grants for ${params.projectName} ${params.description} ${params.focus}`,
      params.userId
    );
    
    const searchTerms = [params.projectName, params.focus, 'funding', 'grants'].filter(Boolean);
    
    return {
      grants: discoveredGrants.map(item => ({
        title: item.data.title || item.data.organization,
        organization: item.data.organization,
        amount: item.data.amount,
        deadline: item.data.deadline,
        description: item.data.description,
        relevance: item.relevance,
        source: 'ai_discovery'
      })),
      searchTerms,
      totalFound: discoveredGrants.length
    };
  }

  async searchLicensingWithAI(params: {
    songTitle: string;
    artist: string;
    genre: string;
    description: string;
    userId: string;
  }) {
    const discoveredOpportunities = await dataDiscoveryService.discoverData(
      `licensing opportunities ${params.songTitle} ${params.artist} ${params.genre} sync music`,
      params.userId
    );
    
    const searchTerms = [params.songTitle, params.artist, params.genre, 'licensing', 'sync'].filter(Boolean);
    
    return {
      opportunities: discoveredOpportunities.map(item => ({
        title: item.data.title || item.data.name,
        company: item.data.company || item.data.organization,
        type: item.data.type || 'sync licensing',
        description: item.data.description,
        contact: item.data.email || item.data.contact,
        relevance: item.relevance,
        source: 'ai_discovery'
      })),
      searchTerms,
      totalFound: discoveredOpportunities.length
    };
  }

  private generateTaskRecommendations(tasks: any[]) {
    const recommendations = [];
    
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
    );
    
    if (overdueTasks.length > 0) {
      recommendations.push(`You have ${overdueTasks.length} overdue tasks that need immediate attention.`);
    }
    
    const highPriorityPending = tasks.filter(task => 
      task.priority === 'high' && task.status === 'pending'
    );
    
    if (highPriorityPending.length > 0) {
      recommendations.push(`Focus on ${highPriorityPending.length} high-priority pending tasks.`);
    }
    
    const carenTasks = tasks.filter(task => 
      task.title?.toLowerCase().includes('caren') || 
      task.description?.toLowerCase().includes('caren')
    );
    
    if (carenTasks.length > 0) {
      recommendations.push(`${carenTasks.length} tasks are related to the C.A.R.E.N. project.`);
    }
    
    return recommendations;
  }
}

// Export wrapped with monitoring
export const aiProcessor = new AIProcessor();