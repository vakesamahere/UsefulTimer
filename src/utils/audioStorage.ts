import { v4 as uuidv4 } from 'uuid';
import type { AudioData } from './timer';

/**
 * 音频存储管理器
 * 封装音频数据的存储和获取，支持本地存储和未来的数据库扩展
 */
export class AudioStorageManager {
  private static instance: AudioStorageManager;
  private readonly STORAGE_KEY = 'AudioDownload';

  private constructor() {}

  static getInstance(): AudioStorageManager {
    if (!AudioStorageManager.instance) {
      AudioStorageManager.instance = new AudioStorageManager();
    }
    return AudioStorageManager.instance;
  }

  /**
   * 保存音频数据
   * @param audioBlob 音频Blob数据
   * @param downloadUrl 下载地址（文件路径或URL）
   * @returns 生成的UUID
   */
  async saveAudio(audioBlob: Blob, downloadUrl: string): Promise<string> {
    const audioId = uuidv4();
    const audioData: AudioData = {
      audioBlob,
      downloadUrl,
      createdAt: Date.now()
    };

    try {
      // 将Blob转换为Base64存储
      const base64Data = await this.blobToBase64(audioBlob);
      const storageData = {
        base64Data,
        downloadUrl,
        createdAt: audioData.createdAt
      };

      const allAudioData = this.getAllAudioData();
      allAudioData[audioId] = storageData;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allAudioData));
      
      console.log(`音频已保存，ID: ${audioId}`);
      return audioId;
    } catch (error) {
      console.error('保存音频失败:', error);
      throw error;
    }
  }

  /**
   * 获取音频数据
   * @param audioId 音频UUID
   * @returns 音频数据或null
   */
  async getAudio(audioId: string): Promise<AudioData | null> {
    try {
      const allAudioData = this.getAllAudioData();
      const storageData = allAudioData[audioId];
      
      if (!storageData) {
        console.warn(`音频不存在，ID: ${audioId}`);
        return null;
      }

      // 将Base64转换回Blob
      const audioBlob = await this.base64ToBlob(storageData.base64Data);
      
      return {
        audioBlob,
        downloadUrl: storageData.downloadUrl,
        createdAt: storageData.createdAt
      };
    } catch (error) {
      console.error('获取音频失败:', error);
      return null;
    }
  }

  /**
   * 删除音频数据
   * @param audioId 音频UUID
   */
  deleteAudio(audioId: string): boolean {
    try {
      const allAudioData = this.getAllAudioData();
      if (allAudioData[audioId]) {
        delete allAudioData[audioId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allAudioData));
        console.log(`音频已删除，ID: ${audioId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除音频失败:', error);
      return false;
    }
  }

  /**
   * 获取所有音频ID列表
   */
  getAllAudioIds(): string[] {
    try {
      const allAudioData = this.getAllAudioData();
      return Object.keys(allAudioData);
    } catch (error) {
      console.error('获取音频列表失败:', error);
      return [];
    }
  }

  /**
   * 清空所有音频数据
   */
  clearAllAudio(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('所有音频数据已清空');
    } catch (error) {
      console.error('清空音频数据失败:', error);
    }
  }

  /**
   * 获取音频存储统计信息
   */
  getStorageStats(): { count: number; totalSize: number } {
    try {
      const allAudioData = this.getAllAudioData();
      const count = Object.keys(allAudioData).length;
      const dataString = JSON.stringify(allAudioData);
      const totalSize = new Blob([dataString]).size;
      
      return { count, totalSize };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  // 私有方法
  private getAllAudioData(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('读取音频数据失败:', error);
      return {};
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:前缀，只保留base64数据
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64Data: string): Promise<Blob> {
    try {
      // 添加data:前缀
      const dataUrl = `data:audio/mpeg;base64,${base64Data}`;
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Base64转Blob失败:', error);
      throw error;
    }
  }
}

/**
 * 音频获取器 - 封装音频获取逻辑
 */
export class AudioRetriever {
  private static instance: AudioRetriever;
  private storageManager: AudioStorageManager;

  private constructor() {
    this.storageManager = AudioStorageManager.getInstance();
  }

  static getInstance(): AudioRetriever {
    if (!AudioRetriever.instance) {
      AudioRetriever.instance = new AudioRetriever();
    }
    return AudioRetriever.instance;
  }

  /**
   * 获取可播放的音频对象
   * @param audioId 音频UUID
   * @returns HTMLAudioElement或null
   */
  async getPlayableAudio(audioId: string): Promise<HTMLAudioElement | null> {
    try {
      const audioData = await this.storageManager.getAudio(audioId);
      if (!audioData) {
        return null;
      }

      const audioUrl = URL.createObjectURL(audioData.audioBlob);
      const audio = new Audio(audioUrl);
      
      // 清理URL对象以防止内存泄漏
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });

      return audio;
    } catch (error) {
      console.error('获取可播放音频失败:', error);
      return null;
    }
  }

  /**
   * 预加载音频
   * @param audioId 音频UUID
   */
  async preloadAudio(audioId: string): Promise<boolean> {
    try {
      const audio = await this.getPlayableAudio(audioId);
      if (audio) {
        audio.preload = 'auto';
        return true;
      }
      return false;
    } catch (error) {
      console.error('预加载音频失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const audioStorage = AudioStorageManager.getInstance();
export const audioRetriever = AudioRetriever.getInstance();
