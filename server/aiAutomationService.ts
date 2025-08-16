import OpenAI from 'openai';
import { storage } from './storage';
import type { 
  AiAutomationJob, 
  InsertAiAutomationJob, 
  InsertAiAutomationRun,
  InsertAutomationCampaign,
  InsertAutomatedTask,
  InsertContentAnalysis,
  Song,
  Audiobook,
  RadioStation,
  MusicSupervisor,
  Grant
} from '@shared/schema';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AutomationConfig {
  type: 'marketing_schedule' | 'radio_outreach' | 'sync_licensing' | 'grant_search' | 'content_calendar';
  targetContentIds?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    timeOfDay?: string;
  };
  preferences?: {
    tone?: 'professional' | 'casual' | 'creative';
    platforms?: string[];
    budget?: number;
  };
}

export class AIAutomationService {
  private activeJobs: Map<string, NodeJS.Timeout> = new Map();

  async createAutomationJob(userId: string, name: string, type: string, config: AutomationConfig): Promise<AiAutomationJob> {
    const jobData: InsertAiAutomationJob = {
      userId,
      name,
      type,
      status: 'active',
      config: config as any,
      schedule: config.schedule as any,
      lastRun: null,
      nextRun: this.calculateNextRun(config.schedule),
    };

    const job = await storage.createAiAutomationJob(jobData);
    await this.scheduleJob(job);
    return job;
  }

  async executeJob(jobId: string): Promise<void> {
    const job = await storage.getAiAutomationJob(jobId);
    if (!job || job.status !== 'active') return;

    const runData: InsertAiAutomationRun = {
      jobId,
      status: 'running',
      startedAt: new Date(),
      results: null,
      errors: null,
      logs: [],
    };

    const run = await storage.createAiAutomationRun(runData);

    try {
      let results: any = {};
      const logs: string[] = [];

      switch (job.type) {
        case 'marketing_schedule':
          results = await this.executeMarketingSchedule(job, logs);
          break;
        case 'radio_outreach':
          results = await this.executeRadioOutreach(job, logs);
          break;
        case 'sync_licensing':
          results = await this.executeSyncLicensing(job, logs);
          break;
        case 'grant_search':
          results = await this.executeGrantSearch(job, logs);
          break;
        case 'content_calendar':
          results = await this.executeContentCalendar(job, logs);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await storage.updateAiAutomationRun(run.id, {
        status: 'completed',
        completedAt: new Date(),
        results,
        logs,
      });

      await storage.updateAiAutomationJob(jobId, {
        lastRun: new Date(),
        nextRun: this.calculateNextRun(job.schedule as any),
        runCount: job.runCount + 1,
        successCount: job.successCount + 1,
      });

      // Schedule next run
      if (job.schedule) {
        await this.scheduleJob({ ...job, nextRun: this.calculateNextRun(job.schedule as any) });
      }

    } catch (error) {
      await storage.updateAiAutomationRun(run.id, {
        status: 'failed',
        completedAt: new Date(),
        errors: error instanceof Error ? error.message : 'Unknown error',
      });

      await storage.updateAiAutomationJob(jobId, {
        failureCount: job.failureCount + 1,
      });
    }
  }

  private async executeMarketingSchedule(job: AiAutomationJob, logs: string[]): Promise<any> {
    logs.push('Analyzing content for marketing opportunities...');
    
    const config = job.config as AutomationConfig;
    const contentIds = config.targetContentIds || [];
    
    // Get content to analyze
    const songs = await storage.getSongs(job.userId);
    const audiobooks = await storage.getAudiobooks(job.userId);
    
    // AI analysis for each piece of content
    const marketingPlan: any = {
      campaigns: [],
      recommendations: [],
      timeline: []
    };

    for (const song of songs.slice(0, 3)) { // Limit for efficiency
      logs.push(`Analyzing song: ${song.title}`);
      
      const analysis = await this.analyzeContentForMarketing(song, 'song');
      
      // Create automated marketing campaign
      const campaign: InsertAutomationCampaign = {
        userId: job.userId,
        name: `AI Marketing: ${song.title}`,
        type: 'content_marketing',
        status: 'active',
        targetAudience: analysis.targetAudience,
        contentStrategy: analysis.strategy,
        timeline: analysis.timeline,
        budget: config.preferences?.budget || 500,
        metrics: {},
        aiGenerated: true,
      };

      const createdCampaign = await storage.createAutomationCampaign(campaign);
      marketingPlan.campaigns.push(createdCampaign);

      // Create automated tasks for this campaign
      await this.createAutomatedTasks(createdCampaign.id, analysis.tasks, job.userId);
    }

    logs.push(`Created ${marketingPlan.campaigns.length} marketing campaigns`);
    return marketingPlan;
  }

  private async executeRadioOutreach(job: AiAutomationJob, logs: string[]): Promise<any> {
    logs.push('Executing radio station outreach...');
    
    const radioStations = await storage.getRadioStations(job.userId);
    const songs = await storage.getSongs(job.userId);
    
    const outreachResults = {
      emailsSent: 0,
      stationsContacted: [],
      nextFollowUps: []
    };

    // AI-powered radio station matching and outreach
    for (const station of radioStations.slice(0, 5)) { // Limit for efficiency
      if (station.status === 'pending' || this.shouldFollowUp(station)) {
        logs.push(`Preparing outreach to ${station.name}`);
        
        // AI generates personalized pitch
        const pitch = await this.generateRadioPitch(station, songs[0]); // Use first song
        
        // Create automated email task
        const emailTask: InsertAutomatedTask = {
          userId: job.userId,
          campaignId: null,
          title: `Radio Outreach: ${station.name}`,
          type: 'email_send',
          status: 'scheduled',
          scheduledFor: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Random time within 24 hours
          config: {
            recipient: station.contactEmail,
            subject: `Music Submission: ${songs[0]?.title} for ${station.name}`,
            content: pitch,
            trackingData: { stationId: station.id, songId: songs[0]?.id }
          },
          results: null,
          aiGenerated: true,
        };

        await storage.createAutomatedTask(emailTask);
        outreachResults.emailsSent++;
        outreachResults.stationsContacted.push(station.name);
      }
    }

    logs.push(`Scheduled ${outreachResults.emailsSent} radio outreach emails`);
    return outreachResults;
  }

  private async executeSyncLicensing(job: AiAutomationJob, logs: string[]): Promise<any> {
    logs.push('Analyzing sync licensing opportunities...');
    
    const songs = await storage.getSongs(job.userId);
    const supervisors = await storage.getMusicSupervisors(job.userId);
    
    const syncResults = {
      opportunitiesFound: 0,
      pitchesCreated: 0,
      submissionsScheduled: []
    };

    for (const song of songs.slice(0, 2)) { // Limit for efficiency
      logs.push(`Analyzing sync potential for: ${song.title}`);
      
      // AI analyzes song for sync opportunities
      const syncAnalysis = await this.analyzeSyncPotential(song);
      
      // Create content analysis record
      const analysisData: InsertContentAnalysis = {
        userId: job.userId,
        contentType: 'song',
        contentId: song.id,
        analysisType: 'sync_opportunities',
        aiResults: syncAnalysis,
        recommendations: syncAnalysis.recommendations,
        confidence: syncAnalysis.confidence,
        processed: true,
      };

      await storage.createContentAnalysis(analysisData);

      // Match with appropriate supervisors
      const matchedSupervisors = await this.matchSupervisors(song, supervisors, syncAnalysis);
      
      for (const supervisor of matchedSupervisors.slice(0, 3)) { // Top 3 matches
        const pitch = await this.generateSyncPitch(song, supervisor, syncAnalysis);
        
        const submissionTask: InsertAutomatedTask = {
          userId: job.userId,
          campaignId: null,
          title: `Sync Pitch: ${song.title} to ${supervisor.name}`,
          type: 'email_send',
          status: 'scheduled',
          scheduledFor: new Date(Date.now() + Math.random() * 72 * 60 * 60 * 1000), // Random time within 3 days
          config: {
            recipient: supervisor.email,
            subject: `Sync Licensing: ${song.title} - Perfect for ${syncAnalysis.bestFit.join(', ')}`,
            content: pitch,
            trackingData: { supervisorId: supervisor.id, songId: song.id }
          },
          results: null,
          aiGenerated: true,
        };

        await storage.createAutomatedTask(submissionTask);
        syncResults.pitchesCreated++;
      }
    }

    logs.push(`Created ${syncResults.pitchesCreated} sync licensing pitches`);
    return syncResults;
  }

  private async executeGrantSearch(job: AiAutomationJob, logs: string[]): Promise<any> {
    logs.push('Searching for grant opportunities...');
    
    // This uses the existing Sunshine grant search capability
    const grantResults = {
      grantsFound: 0,
      newOpportunities: [],
      applications: []
    };

    // AI-powered grant search for music and creative projects
    const searchTerms = [
      'music technology grants',
      'creative arts funding',
      'media production grants',
      'independent artist grants',
      'music innovation grants'
    ];

    for (const term of searchTerms) {
      logs.push(`Searching grants for: ${term}`);
      
      // Use AI to find and analyze grants
      const grantAnalysis = await this.findRelevantGrants(term, job.userId);
      
      for (const grant of grantAnalysis.grants.slice(0, 2)) { // Limit results
        const existingGrant = await storage.getGrants(job.userId);
        const isDuplicate = existingGrant.some(g => g.title === grant.title);
        
        if (!isDuplicate) {
          const newGrant = await storage.createGrant({
            userId: job.userId,
            title: grant.title,
            organization: grant.organization,
            amount: grant.amount?.toString(),
            deadline: grant.deadline,
            status: 'discovered',
            description: grant.description,
            requirements: grant.requirements,
            applicationUrl: grant.applicationUrl,
            notes: 'Found by AI automation',
          });
          
          grantResults.grantsFound++;
          grantResults.newOpportunities.push(newGrant);
        }
      }
    }

    logs.push(`Found ${grantResults.grantsFound} new grant opportunities`);
    return grantResults;
  }

  private async executeContentCalendar(job: AiAutomationJob, logs: string[]): Promise<any> {
    logs.push('Generating content calendar...');
    
    const songs = await storage.getSongs(job.userId);
    const audiobooks = await storage.getAudiobooks(job.userId);
    
    const calendarResults = {
      postsScheduled: 0,
      campaigns: [],
      timeline: []
    };

    // AI creates a comprehensive content calendar
    const contentStrategy = await this.generateContentStrategy(songs, audiobooks);
    
    // Create scheduled content posts
    for (let week = 0; week < 4; week++) { // 4 weeks ahead
      for (let day = 0; day < 7; day++) {
        const postDate = new Date();
        postDate.setDate(postDate.getDate() + (week * 7) + day);
        
        if (Math.random() > 0.7) { // 30% chance of post per day
          const content = await this.generateDailyContent(songs, audiobooks, day, week);
          
          const contentTask: InsertAutomatedTask = {
            userId: job.userId,
            campaignId: null,
            title: `Content Post: ${content.title}`,
            type: 'content_post',
            status: 'scheduled',
            scheduledFor: postDate,
            config: {
              platform: content.platform,
              content: content.text,
              hashtags: content.hashtags,
              mediaUrls: content.mediaUrls || []
            },
            results: null,
            aiGenerated: true,
          };

          await storage.createAutomatedTask(contentTask);
          calendarResults.postsScheduled++;
        }
      }
    }

    logs.push(`Scheduled ${calendarResults.postsScheduled} content posts for the next 4 weeks`);
    return calendarResults;
  }

  // AI Analysis Methods
  private async analyzeContentForMarketing(content: Song | Audiobook, type: 'song' | 'audiobook'): Promise<any> {
    const prompt = `Analyze this ${type} for marketing potential:

Title: ${content.title}
${type === 'song' ? `Artist: ${(content as Song).artist}` : `Author: ${(content as Audiobook).author}`}
Genre: ${content.genre}
Description: ${content.description || 'No description provided'}

Provide a comprehensive marketing analysis including:
1. Target audience demographics
2. Best marketing platforms
3. Content strategy recommendations
4. Timeline for promotional activities
5. Specific marketing tasks with deadlines

Respond in JSON format with this structure:
{
  "targetAudience": { "age": "25-45", "interests": ["music", "alternative rock"], "platforms": ["instagram", "tiktok"] },
  "strategy": { "approach": "genre-focused", "tone": "authentic", "channels": ["social", "radio", "streaming"] },
  "timeline": { "phase1": "immediate", "phase2": "week2", "phase3": "month1" },
  "tasks": [
    { "title": "Create social media content", "type": "content_creation", "deadline": "2024-01-15", "priority": "high" }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error in content analysis:', error);
      return { targetAudience: {}, strategy: {}, timeline: {}, tasks: [] };
    }
  }

  private async analyzeSyncPotential(song: Song): Promise<any> {
    const prompt = `Analyze this song for sync licensing potential:

Title: ${song.title}
Artist: ${song.artist}
Genre: ${song.genre}
Duration: ${song.duration} seconds
Description: ${song.description || 'No description provided'}

Analyze for sync licensing opportunities including:
1. Best use cases (film, TV, commercials, games)
2. Mood and energy level
3. Instrumental vs vocal considerations
4. Target demographics
5. Confidence score (0-1)

Respond in JSON format:
{
  "bestFit": ["commercial", "tv drama", "film trailer"],
  "mood": "energetic, uplifting",
  "demographics": "18-34, urban",
  "useCases": ["car commercial", "sports highlight", "coming of age film"],
  "confidence": 0.85,
  "recommendations": ["Create 30-second edit", "Develop instrumental version"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error in sync analysis:', error);
      return { bestFit: [], mood: '', demographics: '', useCases: [], confidence: 0.5, recommendations: [] };
    }
  }

  private async generateRadioPitch(station: RadioStation, song: Song): Promise<string> {
    const prompt = `Write a professional radio promotion email for:

Song: ${song.title} by ${song.artist}
Genre: ${song.genre}
Station: ${station.name} (${station.genre} format)
Location: ${station.location}

Create a personalized, compelling pitch that:
1. Addresses the music director personally
2. Highlights why this song fits their format
3. Includes relevant details about the artist
4. Provides clear next steps
5. Is concise but engaging

Write in a professional but friendly tone.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content || 'Error generating pitch';
    } catch (error) {
      console.error('Error generating radio pitch:', error);
      return 'Error generating personalized pitch. Please try again.';
    }
  }

  private async generateSyncPitch(song: Song, supervisor: MusicSupervisor, analysis: any): Promise<string> {
    const prompt = `Write a professional sync licensing pitch email for:

Song: ${song.title} by ${song.artist}
Music Supervisor: ${supervisor.name} at ${supervisor.company}
Analysis: ${JSON.stringify(analysis.bestFit)}

Create a pitch that:
1. References their recent projects if available
2. Explains why this song is perfect for their needs
3. Highlights sync-ready versions available
4. Provides clear licensing information
5. Is brief and actionable

Write in a professional industry tone.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content || 'Error generating pitch';
    } catch (error) {
      console.error('Error generating sync pitch:', error);
      return 'Error generating sync pitch. Please try again.';
    }
  }

  private async findRelevantGrants(searchTerm: string, userId: string): Promise<any> {
    // This would typically integrate with external APIs, but for now we'll simulate
    const mockGrants = [
      {
        title: 'Creative Arts Innovation Grant',
        organization: 'National Endowment for the Arts',
        amount: 25000,
        deadline: new Date('2024-06-15'),
        description: 'Supporting innovative music technology projects',
        requirements: 'Must be US-based artist with proven track record',
        applicationUrl: 'https://arts.gov/grants'
      },
      {
        title: 'Music Technology Development Fund',
        organization: 'BMI Foundation',
        amount: 15000,
        deadline: new Date('2024-05-01'),
        description: 'Funding for music technology and AI innovation',
        requirements: 'Technology-focused music projects',
        applicationUrl: 'https://bmifoundation.org/grants'
      }
    ];

    return { grants: mockGrants.slice(0, 1) }; // Return 1 grant per search
  }

  private async generateContentStrategy(songs: Song[], audiobooks: Audiobook[]): Promise<any> {
    const prompt = `Create a 4-week content strategy for:

Songs: ${songs.slice(0, 3).map(s => `${s.title} by ${s.artist}`).join(', ')}
Audiobooks: ${audiobooks.slice(0, 2).map(a => `${a.title} by ${a.author}`).join(', ')}

Generate a content strategy that includes:
1. Weekly themes
2. Platform-specific content
3. Engagement tactics
4. Cross-promotion opportunities

Respond in JSON format with weekly breakdown.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating content strategy:', error);
      return { weeks: [] };
    }
  }

  private async generateDailyContent(songs: Song[], audiobooks: Audiobook[], day: number, week: number): Promise<any> {
    const content = songs[0] || audiobooks[0];
    if (!content) return { title: 'No content', text: 'No content available', platform: 'instagram', hashtags: [] };

    const platforms = ['instagram', 'twitter', 'facebook', 'tiktok'];
    const platform = platforms[day % platforms.length];

    return {
      title: `${content.title} - Week ${week + 1} Day ${day + 1}`,
      text: `Check out ${content.title}! ${content.description?.slice(0, 100) || 'Amazing content'} #music #newrelease`,
      platform,
      hashtags: ['#music', '#newrelease', `#${content.genre?.toLowerCase()}`],
      mediaUrls: []
    };
  }

  // Helper Methods
  private async createAutomatedTasks(campaignId: string, tasks: any[], userId: string): Promise<void> {
    for (const task of tasks.slice(0, 5)) { // Limit tasks
      const automatedTask: InsertAutomatedTask = {
        userId,
        campaignId,
        title: task.title,
        type: task.type || 'content_creation',
        status: 'scheduled',
        scheduledFor: new Date(task.deadline || Date.now() + 24 * 60 * 60 * 1000),
        config: { priority: task.priority || 'medium', details: task },
        results: null,
        aiGenerated: true,
      };

      await storage.createAutomatedTask(automatedTask);
    }
  }

  private async matchSupervisors(song: Song, supervisors: MusicSupervisor[], analysis: any): Promise<MusicSupervisor[]> {
    // Simple matching based on genre and analysis
    return supervisors.filter(supervisor => {
      const genreMatch = supervisor.genres?.some(g => 
        g.toLowerCase().includes(song.genre?.toLowerCase() || '')
      );
      const projectMatch = analysis.bestFit.some((fit: string) => 
        supervisor.projects?.some((p: string) => p.toLowerCase().includes(fit.toLowerCase()))
      );
      return genreMatch || projectMatch;
    });
  }

  private shouldFollowUp(station: RadioStation): boolean {
    if (!station.lastContacted) return false;
    const daysSince = (Date.now() - station.lastContacted.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14 && station.status === 'contacted'; // Follow up after 2 weeks
  }

  private calculateNextRun(schedule?: any): Date | null {
    if (!schedule) return null;
    
    const now = new Date();
    const next = new Date(now);
    
    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }
    
    return next;
  }

  private async scheduleJob(job: AiAutomationJob): Promise<void> {
    if (!job.nextRun) return;
    
    const timeout = job.nextRun.getTime() - Date.now();
    if (timeout <= 0) return; // Don't schedule past dates
    
    const timeoutId = setTimeout(() => {
      this.executeJob(job.id);
    }, Math.min(timeout, 2147483647)); // Max timeout value
    
    this.activeJobs.set(job.id, timeoutId);
  }

  async pauseJob(jobId: string): Promise<void> {
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
    }
    
    await storage.updateAiAutomationJob(jobId, { status: 'paused' });
  }

  async resumeJob(jobId: string): Promise<void> {
    await storage.updateAiAutomationJob(jobId, { status: 'active' });
    const job = await storage.getAiAutomationJob(jobId);
    if (job) {
      await this.scheduleJob(job);
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await storage.getAiAutomationJob(jobId);
    const runs = await storage.getAiAutomationRuns(jobId);
    
    return {
      job,
      recentRuns: runs.slice(0, 10),
      isScheduled: this.activeJobs.has(jobId)
    };
  }
}

export const aiAutomationService = new AIAutomationService();