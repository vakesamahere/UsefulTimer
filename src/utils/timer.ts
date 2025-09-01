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

  /** @description 直接初始化渲染相关变量 */
  rendering: {
    forceUpdateKey: Ref<number>;
  };

  constructor(name?: string, cycleTime?: number) {
    this.id = uuidv4();
    this.name = name || this.id;
    this.cycleTime = cycleTime || 3;
    this.reportTime = [];
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
  audioObj: AudioObj = emptyAudioObj();
  tags: string[];
  path: string[];
  constructor(name?: string, audioObj?: AudioObj, tags?: string[], path?: string[]) {
    this.id = uuidv4();
    this.setName(name || this.id);
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
    return new TimerPoint(this.name, this.audioObj, this.tags);
  }
}

/**
 * @todo 实现一个声音对象，仅处理播放暂停停止
 * @description 来自一个声音模板
 */
export class AudioObj {
  currentTime: number = 0;
  template: AudioObjTemplate = emptyAudioObjTemplate();
  constructor(template?: AudioObjTemplate) {
    this.template = template || emptyAudioObjTemplate();
  }
  /** @TODO */
  play() {
  }
  /** @TODO */
  pause() {
  }
  /** @TODO */
  stop() {
  }
}
export const emptyAudioObj = () => new AudioObj();

/**
 * @todo 实现一个声音模板
 * 有对应的音频信息，可以编辑音量
 */
export class AudioObjTemplate {
  name: string = '';
  src: string = '';
  constructor(name?: string, src?: string) {
    this.name = name || '';
    this.src = src || '';
  }
}
export const emptyAudioObjTemplate = () => new AudioObjTemplate();