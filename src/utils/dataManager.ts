import { Timer, AudioObjTemplate } from './timer';

/**
 * 数据持久化管理器
 * 统一管理所有应用数据的存储和读取
 */
export class DataManager {
  private static instance: DataManager;
  private readonly TIMERS_KEY = 'UsefulTimer_Timers';
  private readonly AUDIO_TEMPLATES_KEY = 'UsefulTimer_AudioTemplates';
  private readonly APP_CONFIG_KEY = 'UsefulTimer_AppConfig';

  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // ==================== Timer 数据管理 ====================

  /**
   * 保存计时器
   */
  saveTimer(timer: Timer): void {
    try {
      timer.touch(); // 更新修改时间
      const timers = this.getAllTimers();

      // 检查是否已存在相同ID的计时器
      const existingTimer = timers[timer.id];
      if (existingTimer) {
        console.log(`更新现有计时器: ${timer.name} (${timer.id})`);
      } else {
        console.log(`保存新计时器: ${timer.name} (${timer.id})`);
      }

      timers[timer.id] = this.serializeTimer(timer);
      localStorage.setItem(this.TIMERS_KEY, JSON.stringify(timers));
      console.log(`计时器已保存: ${timer.name} (${timer.id})`);
    } catch (error) {
      console.error('保存计时器失败:', error);
      // 不抛出异常，避免触发上层的 alert
      // 只在控制台记录错误，让应用继续运行
    }
  }

  /**
   * 获取计时器
   */
  getTimer(id: string): Timer | null {
    try {
      const timers = this.getAllTimers();
      const timerData = timers[id];
      if (!timerData) {
        return null;
      }
      return this.deserializeTimer(timerData);
    } catch (error) {
      console.error('获取计时器失败:', error);
      return null;
    }
  }

  /**
   * 获取所有计时器
   */
  getAllTimers(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.TIMERS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('读取计时器数据失败:', error);
      return {};
    }
  }

  /**
   * 获取计时器列表
   */
  getTimerList(): Timer[] {
    try {
      const timers = this.getAllTimers();
      return Object.values(timers).map(data => this.deserializeTimer(data));
    } catch (error) {
      console.error('获取计时器列表失败:', error);
      return [];
    }
  }

  /**
   * 删除计时器
   */
  deleteTimer(id: string): boolean {
    try {
      const timers = this.getAllTimers();
      if (timers[id]) {
        delete timers[id];
        localStorage.setItem(this.TIMERS_KEY, JSON.stringify(timers));
        console.log(`计时器已删除: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除计时器失败:', error);
      return false;
    }
  }

  // ==================== AudioTemplate 数据管理 ====================

  /**
   * 保存音频模板
   */
  saveAudioTemplate(template: AudioObjTemplate): void {
    try {
      template.touch(); // 更新修改时间
      const templates = this.getAllAudioTemplates();
      templates[template.uuid] = this.serializeAudioTemplate(template);
      localStorage.setItem(this.AUDIO_TEMPLATES_KEY, JSON.stringify(templates));
      console.log(`音频模板已保存: ${template.name} (${template.uuid})`);
    } catch (error) {
      console.error('保存音频模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取音频模板
   */
  getAudioTemplate(uuid: string): AudioObjTemplate | null {
    try {
      const templates = this.getAllAudioTemplates();
      const templateData = templates[uuid];
      if (!templateData) {
        return null;
      }
      return this.deserializeAudioTemplate(templateData);
    } catch (error) {
      console.error('获取音频模板失败:', error);
      return null;
    }
  }

  /**
   * 获取所有音频模板
   */
  getAllAudioTemplates(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.AUDIO_TEMPLATES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('读取音频模板数据失败:', error);
      return {};
    }
  }

  /**
   * 获取音频模板列表
   */
  getAudioTemplateList(): AudioObjTemplate[] {
    try {
      const templates = this.getAllAudioTemplates();
      return Object.values(templates).map(data => this.deserializeAudioTemplate(data));
    } catch (error) {
      console.error('获取音频模板列表失败:', error);
      return [];
    }
  }

  /**
   * 删除音频模板
   */
  deleteAudioTemplate(uuid: string): boolean {
    try {
      const templates = this.getAllAudioTemplates();
      if (templates[uuid]) {
        delete templates[uuid];
        localStorage.setItem(this.AUDIO_TEMPLATES_KEY, JSON.stringify(templates));
        console.log(`音频模板已删除: ${uuid}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除音频模板失败:', error);
      return false;
    }
  }

  // ==================== 应用配置管理 ====================

  /**
   * 保存应用配置
   */
  saveAppConfig(config: Record<string, any>): void {
    try {
      const currentConfig = this.getAppConfig();
      const newConfig = { ...currentConfig, ...config, updatedAt: Date.now() };
      localStorage.setItem(this.APP_CONFIG_KEY, JSON.stringify(newConfig));
      console.log('应用配置已保存');
    } catch (error) {
      console.error('保存应用配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用配置
   */
  getAppConfig(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.APP_CONFIG_KEY);
      return data ? JSON.parse(data) : { createdAt: Date.now() };
    } catch (error) {
      console.error('读取应用配置失败:', error);
      return { createdAt: Date.now() };
    }
  }

  // ==================== 数据统计和管理 ====================

  /**
   * 获取存储统计信息
   */
  getStorageStats(): {
    timers: { count: number; size: number };
    audioTemplates: { count: number; size: number };
    appConfig: { size: number };
    total: { size: number };
  } {
    try {
      const timersData = localStorage.getItem(this.TIMERS_KEY) || '{}';
      const templatesData = localStorage.getItem(this.AUDIO_TEMPLATES_KEY) || '{}';
      const configData = localStorage.getItem(this.APP_CONFIG_KEY) || '{}';

      const timersSize = new Blob([timersData]).size;
      const templatesSize = new Blob([templatesData]).size;
      const configSize = new Blob([configData]).size;

      const timersCount = Object.keys(JSON.parse(timersData)).length;
      const templatesCount = Object.keys(JSON.parse(templatesData)).length;

      return {
        timers: { count: timersCount, size: timersSize },
        audioTemplates: { count: templatesCount, size: templatesSize },
        appConfig: { size: configSize },
        total: { size: timersSize + templatesSize + configSize }
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return {
        timers: { count: 0, size: 0 },
        audioTemplates: { count: 0, size: 0 },
        appConfig: { size: 0 },
        total: { size: 0 }
      };
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData(): void {
    try {
      localStorage.removeItem(this.TIMERS_KEY);
      localStorage.removeItem(this.AUDIO_TEMPLATES_KEY);
      localStorage.removeItem(this.APP_CONFIG_KEY);
      console.log('所有应用数据已清空');
    } catch (error) {
      console.error('清空数据失败:', error);
    }
  }

  /**
   * 清理重复的计时器数据
   */
  cleanupDuplicateTimers(): number {
    try {
      const timers = this.getAllTimers();
      const timersByName: Record<string, any[]> = {};

      // 按名称分组
      Object.values(timers).forEach((timer: any) => {
        if (!timersByName[timer.name]) {
          timersByName[timer.name] = [];
        }
        timersByName[timer.name].push(timer);
      });

      let removedCount = 0;
      const cleanedTimers: Record<string, any> = {};

      // 对于每个名称，只保留最新的一个
      Object.entries(timersByName).forEach(([name, timerGroup]) => {
        if (timerGroup.length > 1) {
          // 按更新时间排序，保留最新的
          timerGroup.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          const latestTimer = timerGroup[0];
          cleanedTimers[latestTimer.id] = latestTimer;
          removedCount += timerGroup.length - 1;
          console.log(`清理重复计时器 "${name}"，移除 ${timerGroup.length - 1} 个重复项`);
        } else {
          cleanedTimers[timerGroup[0].id] = timerGroup[0];
        }
      });

      if (removedCount > 0) {
        localStorage.setItem(this.TIMERS_KEY, JSON.stringify(cleanedTimers));
        console.log(`清理完成，共移除 ${removedCount} 个重复计时器`);
      }

      return removedCount;
    } catch (error) {
      console.error('清理重复数据失败:', error);
      return 0;
    }
  }

  /**
   * 导出所有数据
   */
  exportAllData(): string {
    try {
      const data = {
        timers: this.getAllTimers(),
        audioTemplates: this.getAllAudioTemplates(),
        appConfig: this.getAppConfig(),
        exportedAt: Date.now(),
        version: '1.0.0'
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }

  /**
   * 导入数据
   */
  importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.timers) {
        localStorage.setItem(this.TIMERS_KEY, JSON.stringify(data.timers));
      }
      if (data.audioTemplates) {
        localStorage.setItem(this.AUDIO_TEMPLATES_KEY, JSON.stringify(data.audioTemplates));
      }
      if (data.appConfig) {
        localStorage.setItem(this.APP_CONFIG_KEY, JSON.stringify(data.appConfig));
      }
      
      console.log('数据导入完成');
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  // ==================== 序列化和反序列化 ====================

  private serializeTimer(timer: Timer): any {
    return {
      id: timer.id,
      name: timer.name,
      cycleTime: timer.cycleTime,
      mode: timer.mode,
      playTimes: timer.playTimes,
      reportTime: timer.reportTime,
      createdAt: timer.createdAt,
      updatedAt: timer.updatedAt
      // 注意：不序列化 rendering 字段，因为它包含 Vue 响应式对象
    };
  }

  private deserializeTimer(data: any): Timer {
    const timer = new Timer(data.name, data.cycleTime);
    timer.id = data.id;
    timer.mode = data.mode;
    timer.playTimes = data.playTimes;
    timer.reportTime = data.reportTime || [];
    timer.createdAt = data.createdAt || Date.now();
    timer.updatedAt = data.updatedAt || Date.now();

    // 重新初始化渲染配置，因为这些不能被序列化
    timer.rendering = timer.initializeRerderingConfig();

    return timer;
  }

  private serializeAudioTemplate(template: AudioObjTemplate): any {
    return {
      uuid: template.uuid,
      name: template.name,
      audioId: template.audioId,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  private deserializeAudioTemplate(data: any): AudioObjTemplate {
    const template = new AudioObjTemplate(data.name, data.audioId, data.uuid);
    template.createdAt = data.createdAt || Date.now();
    template.updatedAt = data.updatedAt || Date.now();
    return template;
  }
}

// 导出单例实例
export const dataManager = DataManager.getInstance();
