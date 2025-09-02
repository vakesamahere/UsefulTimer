import { v4 as uuidv4 } from 'uuid';
import { ref, type Ref } from 'vue'
/**
 * @description 计时器类
 * ### 功能
 * - 可以设置一个周期
 * - 周期内可以添加报时时点
 * - 一个报时时点可以配置声音对象
 * 
 * - 可以设置播放模式：无限循环、给定次数循环、一次循环
 * - 状态：运行中，暂停，停止
 */
export class Timer {
  /**
   * @description id-uuid4
   */
  id: string = '';
  /**
   * @description 周期时间，单位为秒
   */
  cycleTime: number = 3;
  /**
   * @description 报时时点
   */
  reportTime: TimerPoint[];
  /**
   * @description 播放模式
   */
  mode: TimerMode = TimerMode.Infinite;
  /**
   * @description 播放次数
   * - 仅在mode为Loop时有效
   */
  playTimes: number = 3;

  /**
   * @description 名称
   */
  name: string = '';

  /**
   * @description 创建时间
   */
  createdAt: number = 0;

  /**
   * @description 修改时间
   */
  updatedAt: number = 0;

  /** @description 直接初始化渲染相关变量 */
  rendering: {
    forceUpdateKey: Ref<number>;
  };

  constructor(name?: string, cycleTime?: number) {
    this.id = uuidv4();
    this.name = name || this.id;
    this.cycleTime = cycleTime || 3;
    this.reportTime = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.rendering = this.initializeRerderingConfig();
  }

  initializeRerderingConfig() {
    return {
      forceUpdateKey: ref(0),
    }
  }

  forceUpdate() {
    this.rendering.forceUpdateKey.value++;
  }

  /**
   * 更新修改时间
   */
  touch(): void {
    this.updatedAt = Date.now();
  }

  addReportTime(reportTime: TimerPoint) {
    this.reportTime.push(reportTime);
  }
  removeReportTime(reportTime: TimerPoint) {
    this.reportTime = this.reportTime.filter(t => t !== reportTime);
  }
  getReportTimesByPath(path: string[]) {
    return this.reportTime.filter(t => t.inDir(path));
  }
  moveReportTime(reportTime: TimerPoint, newPath: string[]) {
    reportTime.setPath(newPath);
  }
  getReportTimesByTag(tag: string) {
    return this.reportTime.filter(t => t.hasTag(tag));
  }

  setMode(mode: TimerMode) {
    this.mode = mode;
  }
  getMode() {
    return this.mode;
  }
  getModeDisplayName() {
    return TimerMode[this.mode];
  }
  toggleMode() {
    this.mode = (this.mode + 1) % 3 + 1;
    this.forceUpdate();
  }

  getPlayTimes() {
    return this.playTimes;
  }
  setPlayTimes(times: number) {
    this.playTimes = times;
  }

  getCycleTime() {
    return this.cycleTime;
  }
  setCycleTime(time: number) {
    this.cycleTime = time;
  }

  getName() {
    return this.name;
  }
  setName(name: string) {
    this.name = name;
  }

  /** @todo */
  start() {
  }
  /** @todo */
  pause() {
  }
  /** @todo */
  stop() {
  }
}

export enum TimerMode {
  Once = 1,
  Loop = 2,
  Infinite = 3,
}

/**
 * @description 报时时点
 * 设置对应的id，声音对象
 * 便于分组管理
 * - 分组管理使用path，形成去中心化的目录结构
 */
export class TimerPoint {
  id: string = '';
  name: string = '';
  time: number = 0; // 在周期中的时间位置（秒）
  audioObj: AudioObj = emptyAudioObj();
  tags: string[];
  path: string[];
  constructor(name?: string, time?: number, audioObj?: AudioObj, tags?: string[], path?: string[]) {
    this.id = uuidv4();
    this.setName(name || this.id);
    this.time = time || 0;
    this.audioObj = audioObj || emptyAudioObj();
    this.tags = tags || [];
    this.path = path || [];
  }
  play() {
    this.audioObj.play();
  }
  pause() {
    this.audioObj.pause();
  }
  stop() {
    this.audioObj.stop();
  }

  setAudioObj(audioObj: AudioObj) {
    this.audioObj = audioObj;
  }
  getAudioObj() {
    return this.audioObj;
  }

  setName(name: string) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  setId(id: string) {
    this.id = id;
  }
  getId() {
    return this.id;
  }

  addTag(tag: string) {
    this.tags.push(tag);
  }
  removeTag(tag: string) {
    this.tags = this.tags.filter(t => t !== tag);
  }
  getTags() {
    return this.tags;
  }
  hasTag(tag: string) {
    return this.tags.includes(tag);
  }
  clearTags() {
    this.tags = [];
  }

  setPath(path: string[]) {
    this.path = path;
  }
  getPaths() {
    return this.path;
  }
  inDir(path: string[]) {
    for (let i = 0; i < path.length; i++) {
      if (this.path.length <= i || this.path[i] !== path[i]) {
        return false;
      }
    }
    return true;
  }

  copy() {
    return new TimerPoint(this.name, this.time, this.audioObj, this.tags, this.path);
  }
}

/**
 * 音频对象 - 实现播放控制
 * @description 来自一个声音模板，使用新的音频存储系统
 */
export class AudioObj {
  currentTime: number = 0;
  template: AudioObjTemplate = emptyAudioObjTemplate();
  private audioElement: HTMLAudioElement | null = null;
  private isLoading: boolean = false;

  constructor(template?: AudioObjTemplate) {
    this.template = template || emptyAudioObjTemplate();
  }

  /**
   * 播放音频
   */
  async play(): Promise<void> {
    try {
      if (!this.template.audioId) {
        console.warn('音频模板没有关联的音频ID');
        return;
      }

      // 如果音频元素不存在或正在加载，先加载音频
      if (!this.audioElement && !this.isLoading) {
        await this.loadAudio();
      }

      if (this.audioElement) {
        this.audioElement.currentTime = this.currentTime;
        await this.audioElement.play();
      }
    } catch (error) {
      console.error('播放音频失败:', error);
    }
  }

  /**
   * 暂停音频
   */
  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.currentTime = this.audioElement.currentTime;
    }
  }

  /**
   * 停止音频
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.currentTime = 0;
    }
  }

  /**
   * 加载音频
   */
  private async loadAudio(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      const { audioRetriever } = await import('./audioStorage');
      this.audioElement = await audioRetriever.getPlayableAudio(this.template.audioId);

      if (this.audioElement) {
        // 设置音频事件监听器
        this.audioElement.addEventListener('timeupdate', () => {
          this.currentTime = this.audioElement!.currentTime;
        });

        this.audioElement.addEventListener('ended', () => {
          this.currentTime = 0;
        });
      }
    } catch (error) {
      console.error('加载音频失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 预加载音频
   */
  async preload(): Promise<void> {
    if (!this.audioElement && !this.isLoading) {
      await this.loadAudio();
    }
  }

  /**
   * 获取音频时长
   */
  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.audioElement?.volume || 1;
  }
}
export const emptyAudioObj = () => new AudioObj();

// 音频数据接口
export interface AudioData {
  audioBlob: Blob;           // 音频信息(可以直接读取播放)
  downloadUrl: string;       // 下载地址（文件路径或url）
  createdAt: number;         // 创建的时间戳
}

/**
 * 音频模板类 - 重新设计为使用UUID引用
 */
export class AudioObjTemplate {
  uuid: string;           // 模板自己的UUID
  name: string;
  audioId: string;        // 指向 AudioDownload 的 UUID
  createdAt: number;      // 创建时间
  updatedAt: number;      // 修改时间

  constructor(name?: string, audioId?: string, uuid?: string) {
    this.uuid = uuid || uuidv4();
    this.name = name || '';
    this.audioId = audioId || '';
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  // 更新模板时调用
  touch(): void {
    this.updatedAt = Date.now();
  }

  // 为了向后兼容，保留 src 属性（映射到 audioId）
  get src(): string {
    return this.audioId;
  }

  set src(value: string) {
    this.audioId = value;
    this.touch();
  }
}
export const emptyAudioObjTemplate = () => new AudioObjTemplate();