import { audioStorage } from './audioStorage';

/**
 * 音频下载器
 * 支持从URL下载音频文件并存储
 */
export class AudioDownloader {
  private static instance: AudioDownloader;

  private constructor() {}

  static getInstance(): AudioDownloader {
    if (!AudioDownloader.instance) {
      AudioDownloader.instance = new AudioDownloader();
    }
    return AudioDownloader.instance;
  }

  /**
   * 从URL下载音频文件
   * @param url 音频文件URL
   * @param name 音频名称（可选）
   * @returns 音频UUID
   */
  async downloadFromUrl(url: string, name?: string): Promise<string> {
    try {
      console.log(`开始下载音频: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      // 验证是否为音频文件
      if (!audioBlob.type.startsWith('audio/')) {
        console.warn(`文件类型可能不是音频: ${audioBlob.type}`);
      }

      const audioId = await audioStorage.saveAudio(audioBlob, url);
      console.log(`音频下载完成，ID: ${audioId}`);
      
      return audioId;
    } catch (error) {
      console.error('下载音频失败:', error);
      throw error;
    }
  }

  /**
   * 从本地文件上传音频
   * @param file 本地文件
   * @returns 音频UUID
   */
  async uploadFromFile(file: File): Promise<string> {
    try {
      console.log(`开始上传音频文件: ${file.name}`);
      
      // 验证文件类型
      if (!file.type.startsWith('audio/')) {
        throw new Error(`不支持的文件类型: ${file.type}`);
      }

      const audioBlob = new Blob([file], { type: file.type });
      const audioId = await audioStorage.saveAudio(audioBlob, file.name);
      
      console.log(`音频上传完成，ID: ${audioId}`);
      return audioId;
    } catch (error) {
      console.error('上传音频失败:', error);
      throw error;
    }
  }

  /**
   * 批量下载音频文件
   * @param urls 音频URL数组
   * @returns 音频UUID数组
   */
  async downloadMultiple(urls: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const url of urls) {
      try {
        const audioId = await this.downloadFromUrl(url);
        results.push(audioId);
      } catch (error) {
        console.error(`下载失败: ${url}`, error);
        // 继续下载其他文件
      }
    }
    
    return results;
  }

  // 移除了预设音频下载功能，避免自动连接外网

  /**
   * 生成静音音频作为备用
   * @param name 音频名称
   * @returns 音频UUID
   */
  async generateSilentAudio(name: string): Promise<string> {
    try {
      // 创建1秒的静音音频
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;
      const duration = 1; // 1秒
      const frameCount = sampleRate * duration;
      
      const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      // 填充静音数据（全为0）
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = 0;
      }

      // 将AudioBuffer转换为WAV格式的Blob
      const wavBlob = await this.audioBufferToWav(audioBuffer);
      const audioId = await audioStorage.saveAudio(wavBlob, `${name}_silent.wav`);
      
      console.log(`生成静音音频: ${name} -> ${audioId}`);
      return audioId;
    } catch (error) {
      console.error('生成静音音频失败:', error);
      throw error;
    }
  }

  /**
   * 将AudioBuffer转换为WAV格式的Blob
   */
  private async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // 音频数据
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

// 导出单例实例
export const audioDownloader = AudioDownloader.getInstance();
