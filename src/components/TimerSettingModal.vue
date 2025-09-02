<template>
  <div
    class="modal-overlay"
    v-if="isVisible"
    @click.self="closeModal"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <div class="modal-content" @contextmenu.prevent>
      <div class="modal-header">
        <h2>Timer 音频时间轴编辑器</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <!-- 基本设置 -->
        <div class="basic-settings">
          <div class="setting-group">
            <label>周期时间:</label>
            <input
              type="number"
              v-model.number="localTimer.cycleTime"
              min="1"
              step="0.1"
              @input="updateTimelineScale"
            />
            <span>秒</span>
          </div>
          <div class="setting-group">
            <label>播放模式:</label>
            <select v-model="localTimer.mode">
              <option :value="TimerMode.Once">一次</option>
              <option :value="TimerMode.Loop">循环</option>
              <option :value="TimerMode.Infinite">无限循环</option>
            </select>
          </div>
          <div class="setting-group" v-if="localTimer.mode === TimerMode.Loop">
            <label>播放次数:</label>
            <input type="number" v-model.number="localTimer.playTimes" min="1" />
          </div>
        </div>

        <!-- 统一的时间轴画布 -->
        <div class="unified-timeline-area">
          <canvas
            ref="mainCanvas"
            class="main-canvas"
            @mousedown="onMainCanvasMouseDown"
            @mousemove="onMainCanvasMouseMove"
            @mouseup="onMainCanvasMouseUp"
            @mouseleave="onMainCanvasMouseUp"
            @dragover.prevent
            @drop="onMainCanvasDrop"
            @contextmenu.prevent
          ></canvas>
        </div>

        <!-- 属性编辑器 -->
        <div class="property-editor" v-if="selectedAudioObject">
          <h4>音频对象属性</h4>
          <div class="property-item">
            <label>名称:</label>
            <input v-model="selectedAudioObject.name" />
          </div>
          <div class="property-item">
            <label>开始时间:</label>
            <input
              type="number"
              v-model.number="selectedAudioObject.start_time"
              step="0.1"
              @input="updateAudioObjectPosition"
            />
            <span>秒</span>
          </div>
          <div class="property-item">
            <label>音频模板:</label>
            <select v-model="selectedAudioObject.template_name">
              <option v-for="template in audioTemplates" :key="template.name" :value="template.name">
                {{ template.name }}
              </option>
            </select>
          </div>
          <div class="property-actions">
            <button @click="duplicateAudioObject" class="duplicate-btn">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
            </button>
            <button @click="deleteAudioObject" class="delete-btn">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span v-if="playState.isPlaying" class="play-status">
          {{ getPlayStatusText() }}
        </span>
        <button @click="togglePlay" class="play-btn" :class="{ playing: playState.isPlaying }">
          <svg v-if="playState.isPlaying" class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button @click="stopPlay" class="stop-btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>
        <button @click="saveSettings" class="save-btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
          </svg>
        </button>
        <button @click="closeModal" class="cancel-btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { Timer, TimerPoint, TimerMode, AudioObjTemplate } from '@/utils/timer';
import { audioDownloader } from '@/utils/audioDownloader';
import { audioStorage } from '@/utils/audioStorage';
import { dataManager } from '@/utils/dataManager';

// 数据结构定义
interface Track {
  id: string;
  name: string;
  mute_state: boolean;
  solo_state: boolean;
  audio_objects: AudioObject[];
}

interface AudioObject {
  id: string;
  name: string;
  template_name: string;
  track_id: string;
  start_time: number;
  duration: number;
  x: number; // Canvas 坐标
  y: number; // Canvas 坐标
  width: number; // Canvas 宽度
  height: number; // Canvas 高度
}

interface TimeWindow {
  start: number; // 显示窗口开始时间
  end: number;   // 显示窗口结束时间
  x: number;     // 缩放框 x 坐标
  width: number; // 缩放框宽度
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  timer: {
    type: Timer,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

// 响应式数据
const isVisible = ref(false);
const localTimer = ref<Timer>(new Timer());

// Canvas 引用
const mainCanvas = ref<HTMLCanvasElement>();

// 时间轴数据
const tracks = ref<Track[]>([
  { id: 'track_1', name: '', mute_state: false, solo_state: false, audio_objects: [] },
  { id: 'track_2', name: '', mute_state: false, solo_state: false, audio_objects: [] },
  { id: 'track_3', name: '', mute_state: false, solo_state: false, audio_objects: [] },
  { id: 'track_4', name: '', mute_state: false, solo_state: false, audio_objects: [] }
]);

// 时间窗口控制
const timeWindow = ref<TimeWindow>({
  start: 0,
  end: 10,
  x: 0,
  width: 200
});

// 音频模板
const audioTemplates = ref<AudioObjTemplate[]>([]);

// 选中的音频对象
const selectedAudioObject = ref<AudioObject | null>(null);

// 拖拽状态
const dragState = ref({
  isDragging: false,
  dragType: '', // 'audio-object', 'time-window', 'time-window-edge', 'asset-drag', 'playhead'
  startX: 0,
  startY: 0,
  originalX: 0 as number, // 明确指定为 number 类型
  originalWidth: 0,
  currentX: 0, // 当前鼠标位置
  currentY: 0,
  draggedTemplate: null as AudioObjTemplate | null, // 被拖拽的模板
  previewTrackIndex: -1, // 预览的轨道索引
  previewTime: 0 // 预览的时间位置
});

// 播放状态
const playState = ref({
  isPlaying: false,
  currentTime: 0,
  playheadPosition: 0, // 播放头在时间轴上的像素位置
  startTime: 0, // 播放开始的时间戳
  currentCycle: 0, // 当前播放的循环次数
  totalCycles: 0 // 总循环次数
});

// Canvas 尺寸常量
const CANVAS_CONFIG = {
  ASSET_LIBRARY_WIDTH: 200,    // 素材库宽度
  TRACK_CONTROLS_WIDTH: 180,   // 轨道控制区宽度
  TIME_WINDOW_HEIGHT: 60,      // 时间窗口高度
  TRACK_HEIGHT: 80,            // 轨道高度
  AUDIO_OBJECT_HEIGHT: 60,     // 音频对象高度
  TIMELINE_RULER_HEIGHT: 20,   // 时间标尺高度
  ASSET_ITEM_HEIGHT: 60,       // 素材项高度
  TRACK_SETTING_HEADER_HEIGHT: 20,            // 轨道设置标题高度
  AUDIO_TEMPLATES_HEADER_HEIGHT: 60            // 素材库标题高度
};

// Canvas 变量
type CanvasVariables = {
  addTrackBtnX: number | null;
  addTrackBtnY: number | null;
  addTrackBtnWidth: number | null;
  addTrackBtnHeight: number | null;

  addAudioTemplateBtnX: number | null;
  addAudioTemplateBtnY: number | null;
  addAudioTemplateBtnWidth: number | null;
  addAudioTemplateBtnHeight: number | null;

  audioTemplates: {
    [uuid: string]: {
      box: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
      playBtn: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }
  }
  audioObjects: {
    [uuid: string]: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }
  trackControlItems: {
    [index: number]: {
      muteBtn: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
      soloBtn: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
      deleteBtn: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }
  }
};
const canvasVariables: CanvasVariables = {
  // add track btn
  addTrackBtnX: null,
  addTrackBtnY: null,
  addTrackBtnWidth: null,
  addTrackBtnHeight: null,

  // add audio template btn
  addAudioTemplateBtnX: null,
  addAudioTemplateBtnY: null,
  addAudioTemplateBtnWidth: null,
  addAudioTemplateBtnHeight: null,

  audioTemplates: {},
  audioObjects: {},
  trackControlItems: {},
}

const cursorInAddTrackBtn = (x: number, y: number) => {
  return x >= (canvasVariables.addTrackBtnX || 0) &&
         x <= (canvasVariables.addTrackBtnX || 0) + (canvasVariables.addTrackBtnWidth || 0) &&
         y >= (canvasVariables.addTrackBtnY || 0) &&
         y <= (canvasVariables.addTrackBtnY || 0) + (canvasVariables.addTrackBtnHeight || 0);
}
const cursorInAddAudioTemplateBtn = (x: number, y: number) => {
  return x >= (canvasVariables.addAudioTemplateBtnX || 0) &&
         x <= (canvasVariables.addAudioTemplateBtnX || 0) + (canvasVariables.addAudioTemplateBtnWidth || 0) &&
         y >= (canvasVariables.addAudioTemplateBtnY || 0) &&
         y <= (canvasVariables.addAudioTemplateBtnY || 0) + (canvasVariables.addAudioTemplateBtnHeight || 0);
}

// 检测鼠标是否在音频模板上
const cursorInAudioTemplate = (x: number, y: number) => {
  for (const uuid in canvasVariables.audioTemplates) {
    const template = canvasVariables.audioTemplates[uuid];
    if (x >= template.box.x && x <= template.box.x + template.box.width &&
        y >= template.box.y && y <= template.box.y + template.box.height) {
      return { uuid, type: 'box' };
    }
  }
  return null;
}

// 检测鼠标是否在音频模板播放按钮上
const cursorInAudioTemplatePlayBtn = (x: number, y: number) => {
  for (const uuid in canvasVariables.audioTemplates) {
    const template = canvasVariables.audioTemplates[uuid];
    if (x >= template.playBtn.x && x <= template.playBtn.x + template.playBtn.width &&
        y >= template.playBtn.y && y <= template.playBtn.y + template.playBtn.height) {
      return uuid;
    }
  }
  return null;
}

// 检测鼠标是否在音频对象上
const cursorInAudioObject = (x: number, y: number) => {
  for (const uuid in canvasVariables.audioObjects) {
    const audioObj = canvasVariables.audioObjects[uuid];
    if (x >= audioObj.x && x <= audioObj.x + audioObj.width &&
        y >= audioObj.y && y <= audioObj.y + audioObj.height) {
      return uuid;
    }
  }
  return null;
}

// 检测鼠标是否在轨道控制按钮上
const cursorInTrackControlBtn = (x: number, y: number) => {
  for (const index in canvasVariables.trackControlItems) {
    const trackIndex = parseInt(index);
    const controls = canvasVariables.trackControlItems[trackIndex];

    // 检测静音按钮
    if (x >= controls.muteBtn.x && x <= controls.muteBtn.x + controls.muteBtn.width &&
        y >= controls.muteBtn.y && y <= controls.muteBtn.y + controls.muteBtn.height) {
      return { trackIndex, type: 'mute' };
    }

    // 检测独奏按钮
    if (x >= controls.soloBtn.x && x <= controls.soloBtn.x + controls.soloBtn.width &&
        y >= controls.soloBtn.y && y <= controls.soloBtn.y + controls.soloBtn.height) {
      return { trackIndex, type: 'solo' };
    }

    // 检测删除按钮
    if (x >= controls.deleteBtn.x && x <= controls.deleteBtn.x + controls.deleteBtn.width &&
        y >= controls.deleteBtn.y && y <= controls.deleteBtn.y + controls.deleteBtn.height) {
      return { trackIndex, type: 'delete' };
    }
  }
  return null;
}

// 监听模态框显示状态
watch(() => props.modelValue, async (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    // 创建 timer 对象的副本
    localTimer.value = new Timer(props.timer.name, props.timer.cycleTime);
    localTimer.value.mode = props.timer.mode;
    localTimer.value.playTimes = props.timer.playTimes;

    // 初始化音频模板
    await initializeAudioTemplates();

    // 将 TimerPoint 转换为 AudioObject
    convertTimerPointsToAudioObjects();

    // 初始化时间窗口
    timeWindow.value.end = localTimer.value.cycleTime;

    nextTick(() => {
      initializeMainCanvas();
      drawMainCanvas();
    });
  }
});

// 基本方法
const closeModal = () => {
  emit('update:modelValue', false);
  selectedAudioObject.value = null;
};

const saveSettings = () => {
  try {
    // 将 AudioObject 转换回 TimerPoint
    convertAudioObjectsToTimerPoints();

    // 保存到数据管理器
    dataManager.saveTimer((localTimer as any).value);

    emit('save', localTimer.value);
    closeModal();

    console.log(`计时器已保存: ${localTimer.value.name} (${localTimer.value.id})`);
  } catch (error) {
    console.error('保存计时器失败:', error);
    // 移除 alert，只在控制台记录错误
    // 让用户通过界面状态了解保存结果
  }
};

// 转换方法
const convertTimerPointsToAudioObjects = () => {
  tracks.value.forEach(track => {
    track.audio_objects = [];
  });

  props.timer.reportTime.forEach((point, index) => {
    const trackIndex = index % tracks.value.length;
    const audioObject: AudioObject = {
      id: point.id,
      name: point.name,
      template_name: point.audioObj.template.name,
      track_id: tracks.value[trackIndex].id,
      start_time: point.time,
      duration: 1, // 默认持续时间
      x: 0,
      y: 0,
      width: 0,
      height: CANVAS_CONFIG.AUDIO_OBJECT_HEIGHT
    };
    tracks.value[trackIndex].audio_objects.push(audioObject);
  });
};

const convertAudioObjectsToTimerPoints = () => {
  try {
    // 清空现有的 reportTime 数组
    localTimer.value.reportTime = [];

    tracks.value.forEach(track => {
      track.audio_objects.forEach(audioObj => {
        try {
          const timerPoint = new TimerPoint(audioObj.name, audioObj.start_time);

          // 设置音频模板（安全地设置）
          const template = audioTemplates.value.find(t => t.name === audioObj.template_name);
          if (template && timerPoint.audioObj) {
            // 创建新的 AudioObjTemplate 实例，避免直接赋值引起的类型问题
            const audioObjTemplate = new AudioObjTemplate(template.name, template.audioId, template.uuid);
            timerPoint.audioObj.template = audioObjTemplate;
          }

          // 直接 push 到数组，而不是使用 addReportTime 方法
          localTimer.value.reportTime.push(timerPoint);
        } catch (audioObjError) {
          console.warn('转换单个音频对象失败:', audioObjError, audioObj);
          // 继续处理其他音频对象，不中断整个过程
        }
      });
    });

    console.log(`转换完成，共 ${localTimer.value.reportTime.length} 个 TimerPoint`);
  } catch (error) {
    console.error('转换音频对象到TimerPoint失败:', error);
    // 不抛出错误，避免影响保存流程
  }
};

// 统一 Canvas 初始化和绘制方法
const initializeMainCanvas = () => {
  if (!mainCanvas.value) return;

  const canvas = mainCanvas.value;
  const container = canvas.parentElement;
  if (!container) return;

  // 设置 Canvas 尺寸
  canvas.width = container.offsetWidth * window.devicePixelRatio;
  canvas.height = container.offsetHeight * window.devicePixelRatio;
  canvas.style.width = container.offsetWidth + 'px';
  canvas.style.height = container.offsetHeight + 'px';

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  // 更新时间窗口尺寸
  const timelineWidth = container.offsetWidth - CANVAS_CONFIG.ASSET_LIBRARY_WIDTH - CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  timeWindow.value.width = timelineWidth * 0.3; // 默认显示30%的时间范围
};

const drawMainCanvas = () => {
  if (!mainCanvas.value) return;

  const canvas = mainCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 绘制各个区域
  drawAssetLibrary(ctx, width, height);
  drawTrackControls(ctx, width, height);
  drawTimeWindow(ctx, width, height);
  drawTimeline(ctx, width, height);
};

const drawAssetLibrary = (ctx: CanvasRenderingContext2D, _canvasWidth: number, canvasHeight: number) => {
  const x = 0;
  const y = 0;
  const width = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH;
  const height = canvasHeight;

  // 绘制背景
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);

  // 绘制标题
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('音频素材库', x + 10, y + 25);

  // 绘制添加按钮
  const btnWidth = width - 20;
  const btnHeight = 20;
  const btnX = x + width/2 - btnWidth/2;
  const btnY = y + 10;

  // 绘制素材列表
  let itemY = y + CANVAS_CONFIG.AUDIO_TEMPLATES_HEADER_HEIGHT;
  audioTemplates.value.forEach((template, _index) => {
    if (itemY + CANVAS_CONFIG.ASSET_ITEM_HEIGHT > height) return;

    drawAssetItem(ctx, template, x + 10, itemY, width - 20, CANVAS_CONFIG.ASSET_ITEM_HEIGHT);
    itemY += CANVAS_CONFIG.ASSET_ITEM_HEIGHT + 5;
  });

  const addBtnY = itemY - y + btnY;
  ctx.fillStyle = '#555555';
  ctx.fillRect(btnX, addBtnY, btnWidth, btnHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('+ 添加', btnX + btnWidth / 2, addBtnY + 16);
  canvasVariables.addAudioTemplateBtnX = btnX;
  canvasVariables.addAudioTemplateBtnY = addBtnY;
  canvasVariables.addAudioTemplateBtnWidth = btnWidth;
  canvasVariables.addAudioTemplateBtnHeight = btnHeight;

};

const drawAssetItem = (ctx: CanvasRenderingContext2D, template: AudioObjTemplate, x: number, y: number, width: number, height: number) => {
  // 绘制背景
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#555';
  ctx.strokeRect(x, y, width, height);

  // 绘制图标
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('🎵', x + 5, y + 25);

  // 绘制名称
  ctx.font = '12px Arial';
  ctx.fillText(template.name, x + 35, y + 20);

  // 绘制时长
  ctx.fillStyle = '#888';
  ctx.font = '10px Arial';
  ctx.fillText('1.0s', x + 35, y + 35);

  // 绘制播放按钮
  const playBtnX = x + width - 30;
  const playBtnY = y + 5;
  const playBtnSize = 20;

  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(playBtnX, playBtnY, playBtnSize, playBtnSize);

  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('▶', playBtnX + playBtnSize / 2, playBtnY + playBtnSize / 2 + 4);

  // 绘制简化波形
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 30; i += 2) {
    const waveX = x + width - 70 + i;
    const waveY = y + height / 2 + Math.sin(i * 0.3) * 6;
    if (i === 0) {
      ctx.moveTo(waveX, waveY);
    } else {
      ctx.lineTo(waveX, waveY);
    }
  }
  ctx.stroke();

  // 更新音频模板坐标到 canvasVariables
  canvasVariables.audioTemplates[template.uuid] = {
    box: {
      x: x,
      y: y,
      width: width,
      height: height
    },
    playBtn: {
      x: playBtnX,
      y: playBtnY,
      width: playBtnSize,
      height: playBtnSize
    }
  };
};

const drawTrackControls = (ctx: CanvasRenderingContext2D, _canvasWidth: number, canvasHeight: number) => {
  const x = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH;
  const y = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
  const width = CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const height = canvasHeight - CANVAS_CONFIG.TIME_WINDOW_HEIGHT;

  // 绘制背景
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);

  // 绘制标题和添加按钮
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('轨道控制', x + 7, y + 15);

  const btnWidth = width - 20;
  const btnHeight = 20;
  const btnX = x + width/2 - btnWidth/2;
  const btnY = y + 2;

  // 绘制轨道控制项
  let trackY = y + CANVAS_CONFIG.TRACK_SETTING_HEADER_HEIGHT;
  tracks.value.forEach((track, _index) => {
    if (trackY + CANVAS_CONFIG.TRACK_HEIGHT > y + height) return;

    drawTrackControlItem(ctx, track, x, trackY, width, CANVAS_CONFIG.TRACK_HEIGHT, _index);
    trackY += CANVAS_CONFIG.TRACK_HEIGHT;
  });

  const addTrackBtnY = trackY + btnY - y + 10;
  ctx.fillStyle = '#555555';
  ctx.fillRect(btnX, addTrackBtnY, btnWidth, btnHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('+ 轨道', btnX + btnWidth / 2, addTrackBtnY + 13);
  canvasVariables.addTrackBtnX = btnX;
  canvasVariables.addTrackBtnY = addTrackBtnY;
  canvasVariables.addTrackBtnWidth = btnWidth;
  canvasVariables.addTrackBtnHeight = btnHeight;
};

const drawTrackControlItem = (ctx: CanvasRenderingContext2D, track: Track, x: number, y: number, width: number, height: number, trackIndex: number) => {
  // 绘制轨道背景
  ctx.fillStyle = getTrackFillColor(trackIndex);
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);

  // 绘制轨道名称 - 使用索引而不是名称字段
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Track ${trackIndex + 1}`, x + 10, y + height / 2);

  // 绘制按钮
  const btnWidth = 25;
  const btnHeight = 20;
  const btnY = y + (height - btnHeight) / 2;

  // 静音按钮
  const muteX = x + width - 90;
  ctx.fillStyle = track.mute_state ? '#f44336' : '#555';
  ctx.fillRect(muteX, btnY, btnWidth, btnHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🔇', muteX + btnWidth / 2, btnY + 14);

  // 独奏按钮
  const soloX = x + width - 60;
  ctx.fillStyle = track.solo_state ? '#FF9800' : '#555';
  ctx.fillRect(soloX, btnY, btnWidth, btnHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🎧', soloX + btnWidth / 2, btnY + 14);

  // 删除按钮
  const deleteX = x + width - 30;
  ctx.fillStyle = '#666';
  ctx.fillRect(deleteX, btnY, btnWidth, btnHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('×', deleteX + btnWidth / 2, btnY + 14);

  // 更新轨道控制按钮坐标到 canvasVariables
  canvasVariables.trackControlItems[trackIndex] = {
    muteBtn: {
      x: muteX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    },
    soloBtn: {
      x: soloX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    },
    deleteBtn: {
      x: deleteX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    }
  };
};

const drawTimeWindow = (ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number) => {
  const x = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const y = 0;
  const width = _canvasWidth - x;
  const height = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;

  // 绘制背景
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);

  // 绘制时间窗口框
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';

  const totalTime = localTimer.value.cycleTime;
  const windowX = x + (timeWindow.value.start / totalTime) * width;
  const windowWidth = ((timeWindow.value.end - timeWindow.value.start) / totalTime) * width;

  ctx.fillRect(windowX, y + 15, windowWidth, height - 30);
  ctx.strokeRect(windowX, y + 15, windowWidth, height - 30);

  // 在时间窗口框上方绘制时间标签
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';

  // 左边界时间标签
  ctx.fillText(formatTime(timeWindow.value.start), windowX, y + 12);

  // 右边界时间标签
  ctx.fillText(formatTime(timeWindow.value.end), windowX + windowWidth, y + 12);

  // 更新时间窗口坐标
  timeWindow.value.x = windowX - x; // 相对于时间轴区域的坐标
  timeWindow.value.width = windowWidth;
};

const drawTimeline = (ctx: CanvasRenderingContext2D, _canvasWidth: number, canvasHeight: number) => {
  const x = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const y = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
  const width = _canvasWidth - x;
  const height = canvasHeight - y;

  // 绘制背景
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);

  // 绘制时间标尺
  drawTimelineRuler(ctx, x, y, width);

  // 绘制轨道背景
  tracks.value.forEach((_track, index) => {
    drawTrackBackground(ctx, x, y + CANVAS_CONFIG.TIMELINE_RULER_HEIGHT + index * CANVAS_CONFIG.TRACK_HEIGHT, width, CANVAS_CONFIG.TRACK_HEIGHT, index);
  });

  // 绘制音频对象（在播放头之前，确保播放头在上层）
  tracks.value.forEach((track, trackIndex) => {
    track.audio_objects.forEach(audioObj => {
      drawAudioObject(ctx, audioObj, trackIndex, x, y, width);
    });
  });

  // 绘制播放头（在音频对象之后，确保在最上层）
  drawPlayhead(ctx, x, y, width, canvasHeight);

  // 绘制拖拽预览
  if (dragState.value.isDragging && dragState.value.dragType === 'asset-drag' && dragState.value.draggedTemplate) {
    if (dragState.value.previewTrackIndex >= 0) {
      // 在时间轴区域显示轨道内预览
      drawDragPreview(ctx, x, y, width);
    } else {
      // 在时间轴区域外显示跟随鼠标的预览
      drawMouseFollowPreview(ctx);
    }
  }
};

const drawTimelineRuler = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
  const rulerHeight = CANVAS_CONFIG.TIMELINE_RULER_HEIGHT;

  // 绘制标尺背景
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, width, rulerHeight);

  const visibleStart = timeWindow.value.start;
  const visibleEnd = timeWindow.value.end;
  const visibleDuration = visibleEnd - visibleStart;

  // 动态刻度系统
  const scaleIntervals = getScaleIntervals(visibleDuration);

  // 为时间标签预留空间（底部15像素）
  const labelSpace = 15;
  const availableHeight = rulerHeight - labelSpace;

  // 绘制每个刻度级别（从小到大，确保主刻度在最上层）
  for (let i = scaleIntervals.length - 1; i >= 0; i--) {
    const interval = scaleIntervals[i];
    const tickHeight = availableHeight * (1 - i * 0.2); // 每级缩短20%，但不超过可用高度
    const isMainScale = i === 0; // 最大级别显示时间标签

    drawScaleTicks(ctx, x, y, width, rulerHeight, tickHeight, interval, visibleStart, visibleEnd, isMainScale, labelSpace);
  }
};

// 根据时间窗口大小确定刻度间隔
const getScaleIntervals = (duration: number): number[] => {
  // 基础间隔序列：x5, x2, x5, x2 循环
  const baseIntervals = [0.05, 0.1, 0.5, 1, 5, 10, 30, 60, 300, 600, 1800, 3600, 18000, 36000];

  // 扩展序列以覆盖更大的时间范围
  const allIntervals = [...baseIntervals];
  let lastInterval = baseIntervals[baseIntervals.length - 1];
  const multipliers = [5, 2, 5, 2]; // x5, x2, x5, x2 循环
  let multiplierIndex = 0;

  // 继续生成更大的间隔
  while (lastInterval < duration * 10) {
    lastInterval *= multipliers[multiplierIndex % multipliers.length];
    allIntervals.push(lastInterval);
    multiplierIndex++;
  }

  // 找到最大等级间隔：尽可能大，但是 duration/interval >= 3
  let maxInterval = 0.05; // 默认最小值
  for (const interval of allIntervals) {
    if (duration / interval >= 3) {
      maxInterval = interval;
    } else {
      break;
    }
  }

  // 生成次级间隔
  const intervals: number[] = [maxInterval];
  const maxIntervalIndex = allIntervals.indexOf(maxInterval);

  // 添加次级间隔（如果存在上一项）
  for (let i = maxIntervalIndex - 1; i >= 0; i--) {
    const subInterval = allIntervals[i];
    intervals.push(subInterval);

    // 检查像素间隔是否太近（假设时间轴宽度为800px）
    const pixelInterval = (subInterval / duration) * 800;
    if (pixelInterval < 10) { // 如果像素间隔小于10px，停止添加更细的刻度
      break;
    }
  }

  return intervals;
};

// 绘制播放头
const drawPlayhead = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, canvasHeight: number) => {
  const visibleStart = timeWindow.value.start;
  const visibleEnd = timeWindow.value.end;
  const visibleDuration = visibleEnd - visibleStart;

  // 计算播放头位置
  const playheadTime = playState.value.currentTime;

  // 只在可见范围内绘制播放头
  if (playheadTime >= visibleStart && playheadTime <= visibleEnd) {
    const ratio = (playheadTime - visibleStart) / visibleDuration;
    const playheadX = x + ratio * width;

    const color = '#eee';
    // 绘制播放头线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, y);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // 绘制播放头顶部的三角形
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(playheadX, y);
    ctx.lineTo(playheadX - 6, y + 12);
    ctx.lineTo(playheadX + 6, y + 12);
    ctx.closePath();
    ctx.fill();

    // 更新播放头位置（用于拖拽检测）
    playState.value.playheadPosition = playheadX;
  }
};

// 绘制特定间隔的刻度线
const drawScaleTicks = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  rulerHeight: number,
  tickHeight: number,
  interval: number,
  visibleStart: number,
  visibleEnd: number,
  showLabels: boolean,
  labelSpace: number
) => {
  const visibleDuration = visibleEnd - visibleStart;

  // 找到第一个整除的时间点
  const startTick = Math.ceil(visibleStart / interval) * interval;

  // 绘制所有在可见范围内的刻度
  for (let time = startTick; time <= visibleEnd; time += interval) {
    if (time < visibleStart) continue;

    const ratio = (time - visibleStart) / visibleDuration;
    const tickX = x + ratio * width;

    // 绘制刻度线 - 统一样式，从顶部开始
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tickX, y);
    ctx.lineTo(tickX, y + tickHeight);
    ctx.stroke();

    // 绘制时间标签（仅最大级别）
    if (showLabels) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      const timeText = formatTime(time);
      // 将标签绘制在预留的标签空间内
      const labelY = y + rulerHeight - labelSpace + 10; // 在标签空间的中央
      ctx.fillText(timeText, tickX, labelY);
    }
  }
};

// 格式化时间显示
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 1 ? 2 : seconds < 10 ? 1 : 0)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h${remainingMinutes}m`;
  }
};

const getTrackFillColor = (index: number): string => {
  return index % 2 === 0 ? '#2a2a2a' : '#333';
};

const drawTrackBackground = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, index: number) => {
  // 绘制轨道背景
  ctx.fillStyle = getTrackFillColor(index);
  ctx.fillRect(x, y, width, height);

  // 绘制轨道边框
  ctx.strokeStyle = '#444';
  ctx.strokeRect(x, y, width, height);
};

// 删除了未使用的 drawTrack 函数

const drawAudioObject = (ctx: CanvasRenderingContext2D, audioObj: AudioObject, trackIndex: number, timelineX: number, timelineY: number, timelineWidth: number) => {
  const visibleStart = timeWindow.value.start;
  const visibleEnd = timeWindow.value.end;
  const visibleDuration = visibleEnd - visibleStart;

  // 音频对象的实际时间范围
  const audioStart = audioObj.start_time;
  const audioEnd = audioObj.start_time + audioObj.duration;

  // 计算音频对象与可见窗口的交集
  const intersectionStart = Math.max(audioStart, visibleStart);
  const intersectionEnd = Math.min(audioEnd, visibleEnd);

  // 如果没有交集，跳过绘制
  if (intersectionStart >= intersectionEnd) return;

  // 计算在画布上的位置和宽度
  const startRatio = (intersectionStart - visibleStart) / visibleDuration;
  const endRatio = (intersectionEnd - visibleStart) / visibleDuration;

  const x = timelineX + startRatio * timelineWidth;
  const objWidth = (endRatio - startRatio) * timelineWidth;
  const y = timelineY + CANVAS_CONFIG.TIMELINE_RULER_HEIGHT + trackIndex * CANVAS_CONFIG.TRACK_HEIGHT + 10;
  const height = CANVAS_CONFIG.AUDIO_OBJECT_HEIGHT;

  // 更新音频对象的坐标信息（用于点击检测）
  audioObj.x = x;
  audioObj.y = y;
  audioObj.width = objWidth;
  audioObj.height = height;

  // 更新音频对象坐标到 canvasVariables
  canvasVariables.audioObjects[audioObj.id] = {
    x: x,
    y: y,
    width: objWidth,
    height: height
  };

  // 绘制音频对象背景
  const isSelected = selectedAudioObject.value?.id === audioObj.id;
  ctx.fillStyle = isSelected ? '#236325' : '#4CAF50';
  ctx.fillRect(x, y, objWidth, height);

  // 绘制边框
  ctx.strokeStyle = isSelected ? '#124714' : '#2E7D32';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, objWidth, height);

  // 如果音频对象被裁剪，绘制裁剪指示器
  if (audioStart < visibleStart) {
    // 左侧被裁剪
    ctx.fillStyle = '#FFA726';
    ctx.fillRect(x, y, 3, height);
  }
  if (audioEnd > visibleEnd) {
    // 右侧被裁剪
    ctx.fillStyle = '#FFA726';
    ctx.fillRect(x + objWidth - 3, y, 3, height);
  }

  // 绘制波形（简化版）- 根据可见部分调整
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();

  // 计算波形的起始偏移（如果左侧被裁剪）
  const waveStartOffset = audioStart < visibleStart ? (visibleStart - audioStart) / audioObj.duration : 0;
  const waveEndOffset = audioEnd > visibleEnd ? (audioEnd - visibleEnd) / audioObj.duration : 0;
  const visibleWaveRatio = 1 - waveStartOffset - waveEndOffset;

  for (let i = 0; i < objWidth; i += 2) {
    const waveProgress = (i / objWidth) * visibleWaveRatio + waveStartOffset;
    const waveHeight = Math.sin(waveProgress * Math.PI * 8) * (height * 0.3);
    const waveY = y + height / 2 + waveHeight;
    if (i === 0) {
      ctx.moveTo(x + i, waveY);
    } else {
      ctx.lineTo(x + i, waveY);
    }
  }
  ctx.stroke();

  // 绘制文字标签
  if (objWidth > 50) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    // 如果左侧被裁剪，显示时间信息
    if (audioStart < visibleStart) {
      ctx.fillText(`${audioObj.name} (${audioStart.toFixed(1)}s-${audioEnd.toFixed(1)}s)`, x + 5, y + height / 2 + 4);
    } else {
      ctx.fillText(audioObj.name, x + 5, y + height / 2 + 4);
    }
  }
};

const drawDragPreview = (ctx: CanvasRenderingContext2D, timelineX: number, timelineY: number, timelineWidth: number) => {
  if (!dragState.value.draggedTemplate || dragState.value.previewTrackIndex < 0) return;

  const visibleStart = timeWindow.value.start;
  const visibleEnd = timeWindow.value.end;
  const visibleDuration = visibleEnd - visibleStart;

  // 计算预览对象在画布上的位置
  const startRatio = (dragState.value.previewTime - visibleStart) / visibleDuration;
  const durationRatio = 1 / visibleDuration; // 默认1秒持续时间

  // 如果预览对象不在可见范围内，跳过绘制
  if (startRatio > 1 || startRatio + durationRatio < 0) return;

  const x = timelineX + Math.max(0, startRatio * timelineWidth);
  const objWidth = Math.min(timelineWidth - (x - timelineX), durationRatio * timelineWidth);
  const y = timelineY + CANVAS_CONFIG.TIMELINE_RULER_HEIGHT + dragState.value.previewTrackIndex * CANVAS_CONFIG.TRACK_HEIGHT + 10;
  const height = CANVAS_CONFIG.AUDIO_OBJECT_HEIGHT;

  // 绘制半透明的预览对象
  ctx.save();
  ctx.globalAlpha = 0.6;

  // 绘制预览背景
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x, y, objWidth, height);

  // 绘制预览边框
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]); // 虚线边框
  ctx.strokeRect(x, y, objWidth, height);

  // 绘制预览波形
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.setLineDash([]); // 重置虚线
  ctx.beginPath();
  for (let i = 0; i < objWidth; i += 2) {
    const waveHeight = Math.sin((i / objWidth) * Math.PI * 8) * (height * 0.3);
    const waveY = y + height / 2 + waveHeight;
    if (i === 0) {
      ctx.moveTo(x + i, waveY);
    } else {
      ctx.lineTo(x + i, waveY);
    }
  }
  ctx.stroke();

  // 绘制预览文字标签
  if (objWidth > 50) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(dragState.value.draggedTemplate.name, x + 5, y + height / 2 + 4);
  }

  ctx.restore();
};

const drawMouseFollowPreview = (ctx: CanvasRenderingContext2D) => {
  if (!dragState.value.draggedTemplate) return;

  const x = dragState.value.currentX - 30; // 偏移一点，避免被鼠标遮挡
  const y = dragState.value.currentY - 15;
  const width = 60;
  const height = 30;

  // 绘制跟随鼠标的半透明预览
  ctx.save();
  ctx.globalAlpha = 0.8;

  // 绘制背景
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x, y, width, height);

  // 绘制边框
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // 绘制图标
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎵', x + width / 2, y + height / 2 + 5);

  ctx.restore();
};

// 统一的主 Canvas 事件处理
const onMainCanvasMouseDown = (event: MouseEvent) => {
  const canvas = mainCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 检查点击区域
  if (isInAssetLibrary(x, y)) {
    handleAssetLibraryClick(x, y);
  } else if (isInTrackControls(x, y)) {
    handleTrackControlsClick(x, y);
  } else if (isInTimeWindow(x, y)) {
    handleTimeWindowClick(x, y);
  } else if (isInTimeline(x, y)) {
    handleTimelineClick(x, y);
  }
};

const onMainCanvasMouseMove = (event: MouseEvent) => {
  if (!dragState.value.isDragging) return;

  const canvas = mainCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 更新当前鼠标位置
  dragState.value.currentX = x;
  dragState.value.currentY = y;

  if (dragState.value.dragType.startsWith('time-window')) {
    handleTimeWindowDrag(x, y);
  } else if (dragState.value.dragType === 'audio-object') {
    handleAudioObjectDrag(x, y);
  } else if (dragState.value.dragType === 'asset-drag') {
    // 素材拖拽时计算预览位置
    handleAssetDragPreview(x, y);
  } else if (dragState.value.dragType === 'playhead') {
    handlePlayheadDrag(x, y);
  }

  drawMainCanvas();
};

// 处理播放头拖拽
const handlePlayheadDrag = (x: number, _y: number) => {
  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineWidth = (mainCanvas.value?.offsetWidth || 0) - timelineX;
  const relativeX = x - timelineX;

  // 限制在时间轴范围内
  const clampedX = Math.max(0, Math.min(relativeX, timelineWidth));

  // 计算对应的时间
  const visibleStart = timeWindow.value.start;
  const visibleEnd = timeWindow.value.end;
  const visibleDuration = visibleEnd - visibleStart;
  const ratio = clampedX / timelineWidth;
  const newTime = visibleStart + ratio * visibleDuration;

  // 更新播放状态
  playState.value.currentTime = newTime;
  playState.value.playheadPosition = timelineX + clampedX;

  // 如果正在播放，更新播放开始时间
  if (playState.value.isPlaying) {
    playState.value.startTime = Date.now() - newTime * 1000;
  }

  // 重置所有音频对象的状态，让它们重新检测是否需要播放
  tracks.value.forEach(track => {
    track.audio_objects.forEach((audioObj: any) => {
      // 标记为手动跳转，这样下次检查时会重新播放
      if (audioObj.isPlaying) {
        audioObj.wasInRange = false; // 强制重新检测
      }
    });
  });
};

// 移动播放头到指定位置并开始拖拽
const movePlayheadToPositionAndStartDrag = (x: number, y: number) => {
  // 首先移动播放头到点击位置
  handlePlayheadDrag(x, 0);

  // 然后立即开始拖拽状态
  dragState.value = {
    isDragging: true,
    dragType: 'playhead',
    startX: x,
    startY: y,
    originalX: playState.value.currentTime,
    originalWidth: 0,
    currentX: x,
    currentY: y,
    draggedTemplate: null,
    previewTrackIndex: -1,
    previewTime: 0
  };

  console.log(`播放头移动到: ${playState.value.currentTime.toFixed(2)}s 并开始拖拽`);
};

const onMainCanvasMouseUp = (event: MouseEvent) => {
  if (dragState.value.isDragging && dragState.value.dragType === 'asset-drag') {
    // 处理素材拖拽释放
    const canvas = mainCanvas.value;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否释放在时间轴区域
    if (isInTimeline(x, y)) {
      const templateName = (canvas as any)._dragData;
      if (templateName) {
        // 创建模拟的拖拽事件
        const mockEvent = {
          preventDefault: () => {},
          dataTransfer: {
            getData: () => templateName
          }
        };
        handleTimelineDrop(mockEvent as any, x, y);
      }
    }
  }

  // 重置拖拽状态，清除所有拖拽相关数据
  dragState.value = {
    isDragging: false,
    dragType: '',
    startX: 0,
    startY: 0,
    originalX: 0,
    originalWidth: 0,
    currentX: 0,
    currentY: 0,
    draggedTemplate: null,
    previewTrackIndex: -1,
    previewTime: 0
  };

  // 强制重新绘制以清除虚影
  drawMainCanvas();
};

const onMainCanvasDrop = (event: DragEvent) => {
  event.preventDefault();

  const canvas = mainCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (isInTimeline(x, y)) {
    handleTimelineDrop(event, x, y);
  }
};

// 区域检测函数
const isInAssetLibrary = (x: number, _y: number): boolean => {
  return x >= 0 && x <= CANVAS_CONFIG.ASSET_LIBRARY_WIDTH;
};

const isInTrackControls = (x: number, y: number): boolean => {
  return x >= CANVAS_CONFIG.ASSET_LIBRARY_WIDTH &&
         x <= CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH &&
         y >= CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
};

const isInTimeWindow = (x: number, y: number): boolean => {
  return x >= CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH &&
         y >= 0 && y <= CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
};

const isInTimeline = (x: number, y: number): boolean => {
  return x >= CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH &&
         y >= CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
};

// 具体的处理函数
const handleAssetLibraryClick = (x: number, y: number) => {
  // 检查是否点击了添加按钮
  if (cursorInAddAudioTemplateBtn(x, y)) {
    addAudioTemplate();
    return;
  }

  // 检查是否点击了音频模板播放按钮
  const playBtnUuid = cursorInAudioTemplatePlayBtn(x, y);
  if (playBtnUuid) {
    const template = audioTemplates.value.find(t => t.uuid === playBtnUuid);
    if (template) {
      playAudioTemplate(template);
      return;
    }
  }

  // 检查是否点击了音频模板
  const templateResult = cursorInAudioTemplate(x, y);
  if (templateResult) {
    const template = audioTemplates.value.find(t => t.uuid === templateResult.uuid);
    if (template) {
      // 开始拖拽素材 - 创建一个虚拟的拖拽事件
      const canvas = mainCanvas.value;
      if (canvas) {
        // 模拟 HTML5 拖拽 API
        const mockDataTransfer = {
          setData: (_type: string, data: string) => {
            // 存储拖拽数据
            (canvas as any)._dragData = data;
          },
          getData: (_type: string) => {
            return (canvas as any)._dragData || '';
          }
        };

        // 设置拖拽数据
        mockDataTransfer.setData('text/plain', template.name);

        // 开始拖拽状态
        dragState.value = {
          isDragging: true,
          dragType: 'asset-drag',
          startX: x,
          startY: y,
          originalX: 0,
          originalWidth: 0,
          currentX: x,
          currentY: y,
          draggedTemplate: template,
          previewTrackIndex: -1,
          previewTime: 0
        };
      }
    }
  }
};

const handleTrackControlsClick = (x: number, y: number) => {
  // 检查是否点击了添加轨道按钮
  if (cursorInAddTrackBtn(x, y)) {
    addTrack();
    drawMainCanvas();
    return;
  }

  // 检查是否点击了轨道控制按钮
  const trackControlResult = cursorInTrackControlBtn(x, y);
  if (trackControlResult) {
    const { trackIndex, type } = trackControlResult;
    const track = tracks.value[trackIndex];

    if (track) {
      switch (type) {
        case 'mute':
          console.log(`点击静音按钮 - 轨道 ${trackIndex}`);
          toggleMute(track);
          drawMainCanvas();
          break;
        case 'solo':
          console.log(`点击独奏按钮 - 轨道 ${trackIndex}`);
          toggleSolo(track);
          drawMainCanvas();
          break;
        case 'delete':
          console.log(`点击删除按钮 - 轨道 ${trackIndex}`);
          removeTrack(track);
          drawMainCanvas();
          break;
      }
    }
  }
};

const handleTimeWindowClick = (x: number, y: number) => {
  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const relativeX = x - timelineX;

  const windowX = timeWindow.value.x;
  const windowWidth = timeWindow.value.width;

  // 检查是否点击在时间窗口边缘（用于缩放）
  if (Math.abs(relativeX - windowX) < 10) {
    dragState.value = {
      isDragging: true,
      dragType: 'time-window-left-edge',
      startX: x,
      startY: y,
      originalX: windowX,
      originalWidth: windowWidth,
      currentX: x,
      currentY: y,
      draggedTemplate: null,
      previewTrackIndex: -1,
      previewTime: 0
    };
  } else if (Math.abs(relativeX - (windowX + windowWidth)) < 10) {
    dragState.value = {
      isDragging: true,
      dragType: 'time-window-right-edge',
      startX: x,
      startY: y,
      originalX: windowX,
      originalWidth: windowWidth,
      currentX: x,
      currentY: y,
      draggedTemplate: null,
      previewTrackIndex: -1,
      previewTime: 0
    };
  } else if (relativeX >= windowX && relativeX <= windowX + windowWidth) {
    // 点击在时间窗口内部（用于拖动）
    dragState.value = {
      isDragging: true,
      dragType: 'time-window',
      startX: x,
      startY: y,
      originalX: windowX,
      originalWidth: windowWidth,
      currentX: x,
      currentY: y,
      draggedTemplate: null,
      previewTrackIndex: -1,
      previewTime: 0
    };
  }
};

const handleTimelineClick = (x: number, y: number) => {
  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineY = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
  const relativeX = x - timelineX;
  const relativeY = y - timelineY;

  // 首先检查是否点击了播放头
  const playheadX = playState.value.playheadPosition;
  if (playheadX > 0 && Math.abs(relativeX - (playheadX - timelineX)) < 10 && relativeY >= 0) {
    // 点击了播放头，开始拖拽
    dragState.value = {
      isDragging: true,
      dragType: 'playhead',
      startX: x,
      startY: y,
      originalX: playState.value.currentTime,
      originalWidth: 0,
      currentX: x,
      currentY: y,
      draggedTemplate: null,
      previewTrackIndex: -1,
      previewTime: 0
    };
    return;
  }

  // 检查是否点击在音频对象上
  const audioObjectUuid = cursorInAudioObject(x, y);
  if (audioObjectUuid) {
    // 找到对应的音频对象
    let clickedAudioObject: AudioObject | null = null;
    tracks.value.forEach(track => {
      track.audio_objects.forEach(audioObj => {
        if (audioObj.id === audioObjectUuid) {
          clickedAudioObject = audioObj;
        }
      });
    });

    if (clickedAudioObject) {
      selectedAudioObject.value = clickedAudioObject;
      dragState.value = {
        isDragging: true,
        dragType: 'audio-object',
        startX: x,
        startY: y,
        originalX: Number((clickedAudioObject as AudioObject).start_time),
        originalWidth: 0,
        currentX: x,
        currentY: y,
        draggedTemplate: null,
        previewTrackIndex: -1,
        previewTime: 0
      };
    }
  } else {
    selectedAudioObject.value = null;

    // 如果点击在时间轴区域（不是音频对象），移动播放头到点击位置并开始拖拽
    if (relativeX >= 0 && relativeY >= 0) {
      movePlayheadToPositionAndStartDrag(x, y);
    }
  }

  drawMainCanvas();
};

const handleTimeWindowDrag = (x: number, _y: number) => {
  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineWidth = (mainCanvas.value?.offsetWidth || 0) - timelineX;
  const deltaX = x - dragState.value.startX;

  const totalTime = localTimer.value.cycleTime;

  if (dragState.value.dragType === 'time-window') {
    // 拖动整个时间窗口
    const newX = Math.max(0, Math.min(timelineWidth - timeWindow.value.width, dragState.value.originalX + deltaX));
    const newStartTime = (newX / timelineWidth) * totalTime;
    const windowDuration = timeWindow.value.end - timeWindow.value.start;

    timeWindow.value.start = newStartTime;
    timeWindow.value.end = Math.min(totalTime, newStartTime + windowDuration);
  } else if (dragState.value.dragType === 'time-window-left-edge') {
    // 拖动左边缘
    const newX = Math.max(0, Math.min(dragState.value.originalX + dragState.value.originalWidth - 50, dragState.value.originalX + deltaX));
    timeWindow.value.start = (newX / timelineWidth) * totalTime;
  } else if (dragState.value.dragType === 'time-window-right-edge') {
    // 拖动右边缘
    const newWidth = Math.max(50, Math.min(timelineWidth - dragState.value.originalX, dragState.value.originalWidth + deltaX));
    const newEndX = dragState.value.originalX + newWidth;
    timeWindow.value.end = Math.min(totalTime, (newEndX / timelineWidth) * totalTime);
  }
};

const handleAudioObjectDrag = (x: number, y: number) => {
  if (!selectedAudioObject.value) return;

  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineY = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
  const timelineWidth = (mainCanvas.value?.offsetWidth || 0) - timelineX;
  const deltaX = x - dragState.value.startX;

  const visibleDuration = timeWindow.value.end - timeWindow.value.start;
  const timeDelta = (deltaX / timelineWidth) * visibleDuration;

  // 更新音频对象的开始时间
  const newStartTime = Math.max(0, Math.min(localTimer.value.cycleTime - selectedAudioObject.value.duration,
    dragState.value.originalX + timeDelta));

  selectedAudioObject.value.start_time = newStartTime;

  // 检查是否跨轨道拖拽
  const relativeY = y - timelineY;
  const newTrackIndex = Math.floor((relativeY - CANVAS_CONFIG.TIMELINE_RULER_HEIGHT) / CANVAS_CONFIG.TRACK_HEIGHT);

  if (newTrackIndex >= 0 && newTrackIndex < tracks.value.length) {
    const currentTrack = tracks.value.find(t => t.id === selectedAudioObject.value!.track_id);
    const newTrack = tracks.value[newTrackIndex];

    if (currentTrack && newTrack && currentTrack.id !== newTrack.id) {
      // 移动到新轨道
      const audioIndex = currentTrack.audio_objects.findIndex(obj => obj.id === selectedAudioObject.value!.id);
      if (audioIndex !== -1) {
        const audioObj = currentTrack.audio_objects.splice(audioIndex, 1)[0];
        audioObj.track_id = newTrack.id;
        newTrack.audio_objects.push(audioObj);
      }
    }
  }
};

const handleAssetDragPreview = (x: number, y: number) => {
  if (!dragState.value.draggedTemplate) return;

  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineY = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;

  // 检查是否在时间轴区域
  if (x >= timelineX && y >= timelineY) {
    const relativeX = x - timelineX;
    const relativeY = y - timelineY;

    // 计算预览轨道
    const trackIndex = Math.floor((relativeY - CANVAS_CONFIG.TIMELINE_RULER_HEIGHT) / CANVAS_CONFIG.TRACK_HEIGHT);

    if (trackIndex >= 0 && trackIndex < tracks.value.length) {
      dragState.value.previewTrackIndex = trackIndex;

      // 计算预览时间位置
      const timelineWidth = (mainCanvas.value?.offsetWidth || 0) - timelineX;
      const visibleDuration = timeWindow.value.end - timeWindow.value.start;
      const timeRatio = relativeX / timelineWidth;
      const previewTime = timeWindow.value.start + (timeRatio * visibleDuration);

      // 贴靠到网格
      const gridSize = 0.1; // 0.1秒网格
      dragState.value.previewTime = Math.round(previewTime / gridSize) * gridSize;
      dragState.value.previewTime = Math.max(0, Math.min(localTimer.value.cycleTime - 1, dragState.value.previewTime));
    } else {
      dragState.value.previewTrackIndex = -1;
    }
  } else {
    dragState.value.previewTrackIndex = -1;
  }
};

const handleTimelineDrop = (event: DragEvent, x: number, y: number) => {
  const timelineX = CANVAS_CONFIG.ASSET_LIBRARY_WIDTH + CANVAS_CONFIG.TRACK_CONTROLS_WIDTH;
  const timelineY = CANVAS_CONFIG.TIME_WINDOW_HEIGHT;
  const relativeX = x - timelineX;
  const relativeY = y - timelineY;

  // 确定拖放到哪个轨道
  const trackIndex = Math.floor((relativeY - CANVAS_CONFIG.TIMELINE_RULER_HEIGHT) / CANVAS_CONFIG.TRACK_HEIGHT);
  if (trackIndex < 0 || trackIndex >= tracks.value.length) return;

  // 计算时间位置
  const timelineWidth = (mainCanvas.value?.offsetWidth || 0) - timelineX;
  const visibleDuration = timeWindow.value.end - timeWindow.value.start;
  const timeRatio = relativeX / timelineWidth;
  const dropTime = timeWindow.value.start + (timeRatio * visibleDuration);

  // 获取拖拽的模板信息
  const templateName = event.dataTransfer?.getData('text/plain');
  if (!templateName) return;

  const template = audioTemplates.value.find(t => t.name === templateName);
  if (!template) return;

  // 创建新的音频对象
  const newAudioObject: AudioObject = {
    id: `audio_${Date.now()}`,
    name: template.name,
    template_name: template.name,
    track_id: tracks.value[trackIndex].id,
    start_time: Math.max(0, Math.min(localTimer.value.cycleTime - 1, dropTime)),
    duration: 1, // 默认持续时间
    x: 0,
    y: 0,
    width: 0,
    height: CANVAS_CONFIG.AUDIO_OBJECT_HEIGHT
  };

  tracks.value[trackIndex].audio_objects.push(newAudioObject);
  selectedAudioObject.value = newAudioObject;

  drawMainCanvas();
};

// 音频模板初始化
const initializeAudioTemplates = async () => {
  try {
    console.log('开始初始化音频模板...');

    // 清空音频模板数组
    audioTemplates.value = [];

    // 从数据管理器中加载已保存的音频模板
    const savedTemplates = dataManager.getAudioTemplateList();
    console.log(`从数据管理器加载了 ${savedTemplates.length} 个音频模板`);

    // 验证每个模板的音频数据是否存在
    for (const template of savedTemplates) {
      const audioData = await audioStorage.getAudio(template.audioId);
      if (audioData) {
        audioTemplates.value.push(template);
        console.log(`音频模板加载成功: ${template.name} (${template.uuid})`);
      } else {
        console.warn(`音频模板的音频数据不存在，跳过: ${template.name} (${template.audioId})`);
        // 可以选择删除无效的模板
        dataManager.deleteAudioTemplate(template.uuid);
      }
    }

    console.log(`音频模板初始化完成，共 ${audioTemplates.value.length} 个有效模板`);
  } catch (error) {
    console.error('初始化音频模板失败:', error);
  }
};

// 素材库相关方法
const addAudioTemplate = async () => {
  try {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          console.log(`开始上传音频文件: ${file.name}`);

          // 1. 上传音频文件到音频存储
          const audioId = await audioDownloader.uploadFromFile(file);

          // 2. 创建音频模板
          const templateName = file.name.split('.')[0];
          const newTemplate = new AudioObjTemplate(templateName, audioId);

          // 3. 保存到数据管理器
          dataManager.saveAudioTemplate(newTemplate);

          // 4. 添加到界面
          audioTemplates.value.push(newTemplate);
          drawMainCanvas();

          console.log(`音频模板添加成功: ${templateName} (${newTemplate.uuid})`);
        } catch (error) {
          console.error('添加音频模板失败:', error);
          alert('添加音频文件失败，请检查文件格式');
        }
      }
    };

    input.click();
  } catch (error) {
    console.error('打开文件选择器失败:', error);
  }
};

// 轨道控制方法
const addTrack = () => {
  const newTrack: Track = {
    id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // 使用时间戳和随机字符串确保唯一性
    name: '', // 不再使用名称字段，直接通过索引显示
    mute_state: false,
    solo_state: false,
    audio_objects: []
  };
  tracks.value.push(newTrack);

  // 重新绘制时间轴
  nextTick(() => {
    initializeMainCanvas();
    drawMainCanvas();
  });
};

const removeTrack = (track: Track) => {
  if (tracks.value.length <= 1) {
    alert('至少需要保留一个轨道');
    return;
  }

  const index = tracks.value.findIndex(t => t.id === track.id);
  if (index !== -1) {
    tracks.value.splice(index, 1);

    // 重新绘制时间轴
    nextTick(() => {
      initializeMainCanvas();
      drawMainCanvas();
    });
  }
};

const toggleMute = (track: Track) => {
  track.mute_state = !track.mute_state;

  // 如果开启静音，关闭独奏
  if (track.mute_state) {
    track.solo_state = false;
  }
};

const toggleSolo = (track: Track) => {
  track.solo_state = !track.solo_state;

  // 如果开启独奏，关闭静音，并关闭其他轨道的独奏
  if (track.solo_state) {
    track.mute_state = false;
    tracks.value.forEach(t => {
      if (t.id !== track.id) {
        t.solo_state = false;
      }
    });
  }
};

// 属性编辑器相关方法
const updateAudioObjectPosition = () => {
  if (selectedAudioObject.value) {
    drawMainCanvas();
  }
};

const duplicateAudioObject = () => {
  if (!selectedAudioObject.value) return;

  const original = selectedAudioObject.value;
  const newAudioObject: AudioObject = {
    id: `audio_${Date.now()}`,
    name: `${original.name} (副本)`,
    template_name: original.template_name,
    track_id: original.track_id,
    start_time: Math.min(localTimer.value.cycleTime - original.duration, original.start_time + 1),
    duration: original.duration,
    x: 0,
    y: 0,
    width: 0,
    height: CANVAS_CONFIG.AUDIO_OBJECT_HEIGHT
  };

  const track = tracks.value.find(t => t.id === original.track_id);
  if (track) {
    track.audio_objects.push(newAudioObject);
    selectedAudioObject.value = newAudioObject;
    drawMainCanvas();
  }
};

const deleteAudioObject = () => {
  if (!selectedAudioObject.value) return;

  const audioObj = selectedAudioObject.value;
  const track = tracks.value.find(t => t.id === audioObj.track_id);

  if (track) {
    const index = track.audio_objects.findIndex(obj => obj.id === audioObj.id);
    if (index !== -1) {
      track.audio_objects.splice(index, 1);
      selectedAudioObject.value = null;
      drawMainCanvas();
    }
  }
};

// 其他工具方法
const updateTimelineScale = () => {
  timeWindow.value.end = localTimer.value.cycleTime;
  if (timeWindow.value.start >= timeWindow.value.end) {
    timeWindow.value.start = 0;
  }

  nextTick(() => {
    drawMainCanvas();
  });
};

// 播放音频模板
const playAudioTemplate = async (template: AudioObjTemplate) => {
  if (!template.audioId) {
    alert('该音频模板没有关联的音频文件');
    return;
  }

  try {
    console.log(`播放音频模板: ${template.name} (${template.audioId})`);

    // 使用音频获取器获取可播放的音频对象
    const { audioRetriever } = await import('@/utils/audioStorage');
    const audioElement = await audioRetriever.getPlayableAudio(template.audioId);

    if (audioElement) {
      await audioElement.play();
      console.log('音频播放成功');
    } else {
      console.warn('无法获取音频对象');
      alert('音频文件不存在或已损坏');
    }
  } catch (error) {
    console.error('播放音频失败:', error);
    alert('播放失败，请检查音频文件');
  }
};

// 播放控制函数
const togglePlay = () => {
  if (playState.value.isPlaying) {
    pausePlay();
  } else {
    startPlay();
  }
};

const startPlay = () => {
  playState.value.isPlaying = true;
  playState.value.startTime = Date.now() - playState.value.currentTime * 1000;

  // 根据计时器模式设置播放参数
  const timerMode = localTimer.value.mode;
  if (timerMode === TimerMode.Once) {
    playState.value.totalCycles = 1;
  } else if (timerMode === TimerMode.Loop) {
    playState.value.totalCycles = localTimer.value.playTimes;
  } else if (timerMode === TimerMode.Infinite) {
    playState.value.totalCycles = -1; // -1 表示无限循环
  }

  playState.value.currentCycle = 1;

  // 开始播放循环
  playLoop();

  console.log(`开始播放 - 模式: ${timerMode}, 循环次数: ${playState.value.totalCycles}`);
};

const pausePlay = () => {
  playState.value.isPlaying = false;
  console.log('暂停播放');
};

const stopPlay = () => {
  playState.value.isPlaying = false;
  playState.value.currentTime = 0;
  playState.value.playheadPosition = 0;
  playState.value.currentCycle = 0;
  playState.value.totalCycles = 0;

  // 停止所有正在播放的音频
  stopAllAudio();

  // 重绘画布
  drawMainCanvas();

  console.log('停止播放');
};

// 获取播放状态文本
const getPlayStatusText = () => {
  const currentTime = playState.value.currentTime.toFixed(1);
  const totalTime = localTimer.value.cycleTime.toFixed(1);
  const currentCycle = playState.value.currentCycle;
  const totalCycles = playState.value.totalCycles;

  let statusText = `${currentTime}s / ${totalTime}s`;

  if (totalCycles === -1) {
    statusText += ` (循环 ${currentCycle} - 无限)`;
  } else if (totalCycles > 1) {
    statusText += ` (循环 ${currentCycle}/${totalCycles})`;
  }

  return statusText;
};

// 播放循环
const playLoop = () => {
  if (!playState.value.isPlaying) return;

  // 更新当前时间
  const elapsed = (Date.now() - playState.value.startTime) / 1000;
  const cycleTime = localTimer.value.cycleTime;

  // 计算当前在哪个循环中
  const totalElapsed = elapsed;
  const currentCycleTime = totalElapsed % cycleTime;
  const completedCycles = Math.floor(totalElapsed / cycleTime);

  playState.value.currentTime = currentCycleTime;

  // 检查是否完成了所有循环
  if (playState.value.totalCycles > 0 && completedCycles >= playState.value.totalCycles) {
    stopPlay();
    console.log(`播放完成 - 共播放了 ${playState.value.totalCycles} 次`);
    return;
  }

  // 更新当前循环数
  playState.value.currentCycle = completedCycles + 1;

  // 检查是否超过了时间窗口（在当前循环中）
  if (playState.value.currentTime > timeWindow.value.end) {
    // 如果是单次播放或已完成所有循环，停止播放
    if (playState.value.totalCycles === 1 ||
        (playState.value.totalCycles > 0 && playState.value.currentCycle >= playState.value.totalCycles)) {
      stopPlay();
      return;
    }
    // 否则继续下一个循环
  }

  // 检查是否需要播放音频
  checkAndPlayAudio();

  // 重绘画布
  drawMainCanvas();

  // 继续播放循环
  requestAnimationFrame(playLoop);
};

// 检查并播放音频
const checkAndPlayAudio = () => {
  const currentTime = playState.value.currentTime;

  tracks.value.forEach(track => {
    track.audio_objects.forEach((audioObj: any) => {
      const audioStart = audioObj.start_time;
      const audioDuration = audioObj.duration || 1;
      const audioEnd = audioStart + audioDuration;

      // 检查当前时间是否在音频播放范围内
      if (currentTime >= audioStart && currentTime < audioEnd) {
        // 只有在以下情况才播放音频：
        // 1. 音频还没有播放过
        // 2. 播放头被手动拖拽到了新位置（跳跃超过0.5秒）
        // 3. 刚刚进入音频范围（从范围外进入）
        const isJustEntered = !audioObj.wasInRange;
        const isManualSeek = audioObj.lastPlayTime >= 0 && Math.abs(audioObj.lastPlayTime - currentTime) > 0.5;
        const isFirstTime = !audioObj.hasStartedPlaying;

        if (isJustEntered || isManualSeek || isFirstTime) {
          // 计算音频内的偏移时间
          const audioOffset = currentTime - audioStart;
          playAudioByTemplateNameWithOffset(audioObj.template_name, audioOffset);
          audioObj.hasStartedPlaying = true;
          audioObj.isPlaying = true;
          audioObj.lastPlayTime = currentTime;
          console.log(`触发音频播放: ${audioObj.template_name}, 偏移: ${audioOffset.toFixed(2)}s, 原因: ${isJustEntered ? '进入范围' : isManualSeek ? '手动跳转' : '首次播放'}`);
        }

        audioObj.wasInRange = true;
        audioObj.lastPlayTime = currentTime;
      } else {
        // 当前时间不在音频范围内
        if (audioObj.wasInRange) {
          // 刚刚离开音频范围
          audioObj.isPlaying = false;
          audioObj.wasInRange = false;
        }
      }
    });
  });
};

// 根据模板名称播放音频（从指定偏移时间开始）
const playAudioByTemplateNameWithOffset = async (templateName: string, offsetTime: number = 0) => {
  try {
    // 查找对应的音频模板
    const template = audioTemplates.value.find(t => t.name === templateName);
    if (template && template.audioId) {
      const { audioRetriever } = await import('@/utils/audioStorage');
      const audioElement = await audioRetriever.getPlayableAudio(template.audioId);

      if (audioElement) {
        // 设置播放起始时间
        audioElement.currentTime = Math.max(0, offsetTime);
        await audioElement.play();
        console.log(`播放音频: ${template.name}，从 ${offsetTime.toFixed(2)}s 开始`);
      }
    } else {
      console.warn(`未找到音频模板: ${templateName}`);
    }
  } catch (error) {
    console.error('播放音频失败:', error);
  }
};

// 移除了未使用的 playAudioByTemplateName 函数

// 停止所有音频
const stopAllAudio = () => {
  tracks.value.forEach(track => {
    track.audio_objects.forEach((audioObj: any) => {
      audioObj.isPlaying = false;
      audioObj.hasStartedPlaying = false;
      audioObj.wasInRange = false;
      audioObj.lastPlayTime = -1;
    });
  });
};

// 开发者工具函数
const clearAllAudioData = () => {
  if (confirm('确定要清空所有音频数据吗？此操作不可恢复。')) {
    audioStorage.clearAllAudio();
    audioTemplates.value = [];
    drawMainCanvas();
    console.log('所有音频数据已清空');
  }
};

// 在开发环境下暴露清理函数到全局
if (import.meta.env.DEV) {
  (window as any).clearAllAudioData = clearAllAudioData;
  console.log('开发模式：可使用 clearAllAudioData() 清空所有音频数据');
}

</script>

<style scoped>
/* 模态框基础样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  user-select: none;
}

.modal-content {
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 95%;
  max-width: 1400px;
  height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
  background: #2a2a2a;
}

.modal-header h2 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #ff4444;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 基本设置样式 */
.basic-settings {
  display: flex;
  gap: 20px;
  padding: 10px 15px;
  background: #2a2a2a;
  border-radius: 8px;
  align-items: center;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-group label {
  color: #cccccc;
  font-size: 14px;
  white-space: nowrap;
}

.setting-group input,
.setting-group select {
  padding: 6px 10px;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #333;
  color: #ffffff;
  font-size: 14px;
}

.setting-group span {
  color: #cccccc;
  font-size: 14px;
}

/* 统一时间轴区域样式 */
.unified-timeline-area {
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  min-height: 500px;
  position: relative;
}

.main-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  display: block;
}

/* 属性编辑器样式 */
.property-editor {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 15px;
}

.property-editor h4 {
  margin: 0 0 10px 0;
  color: #ffffff;
  font-size: 16px;
}

.property-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.property-item label {
  min-width: 80px;
  color: #cccccc;
  font-size: 14px;
}

.property-item input,
.property-item select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #333;
  color: #ffffff;
  font-size: 14px;
}

.property-item span {
  color: #cccccc;
  font-size: 14px;
}

.property-actions {
  display: flex;
  gap: 3px;
  margin-top: 15px;
}

.duplicate-btn {
  background: var(--btn-primary-bg);
  color: #aaa;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 32px;
}

.delete-btn {
  background: var(--btn-primary-bg);
  color: #aaa;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 32px;
}

.delete-btn:hover,
.duplicate-btn:hover {
  background: var(--btn-primary-hover);
}

/* 模态框底部样式 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding: 15px 20px;
  border-top: 1px solid #333;
  background: #2a2a2a;
}

.modal-footer > button {
  min-width: 34px;
}

.save-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #aaa;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #aaa;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar,
.asset-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.modal-body::-webkit-scrollbar-track,
.asset-list::-webkit-scrollbar-track {
  background: #333;
}

.modal-body::-webkit-scrollbar-thumb,
.asset-list::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.asset-list::-webkit-scrollbar-thumb:hover {
  background: #777;
}


.play-btn {
  background-color: var(--play-btn-bg);
  color: #aaa;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.play-btn:hover {
  background-color: var(--play-btn-hover);
}

.stop-btn {
  background-color: var(--stop-btn-bg);
  color: #aaa;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.stop-btn:hover {
  background-color: var(--stop-btn-hover);
}
</style>
