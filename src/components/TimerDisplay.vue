<template>
  <div :key="props.timer.rendering.forceUpdateKey.value">
    <div class="timer" @mouseleave="()=>{showRenameModalFlag = false}">
      <div class="timer-header">
        <div v-tooltip class="timer-title" @click="showRenameModal()" title="Click to rename">
          <span v-if="!showRenameModalFlag" class="timer-title-text">{{ timer.name }}</span>
          <input v-else v-focus type="text" v-model="timer.name" @blur="rename(timer.name)" @keyup.enter="rename(timer.name)" class="timer-title-text timer-title-input" />
        </div>
        <div class="delete-button-box">
          <button class="btn delete-button" @click="emits('delete', timer.id)">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>
      <div class="timer-meta-quick-setting">
        <button
          v-tooltip
          title="播放/暂停"
          class="btn modern-btn"
          :class="{ playing: playState.isPlaying }"
          @click="togglePlay"
        >
          <svg v-if="playState.isPlaying" class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          v-tooltip
          title="停止播放"
          class="btn modern-btn"
          @click="stopPlay"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>
        <button
          v-tooltip
          title="打开详细设置"
          class="btn modern-btn setting-button"
          @click="openSetting()"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.09-.77-1.74-1.07L14 2.1c-.09-.48-.5-.81-1-.81h-4c-.5 0-.91.33-1 .81L7.54 5.1c-.65.3-1.22.67-1.74 1.07l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.09.77 1.74 1.07L9 21.9c.09.48.5.81 1 .81h4c.5 0 .91-.33 1-.81l.46-2.58c.65-.3 1.22-.67 1.74-1.07l2.49 1c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
          </svg>
        </button>
        <div class="spacer"></div>
        <button
          v-tooltip
          :title="`点击切换播放模式，当前: ${timer.getModeDisplayName()}`"
          class="btn modern-btn"
          @click="timer.toggleMode()"
        >
          <svg v-if="timer.mode === TimerMode.Infinite" class="icon" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4ECDC4" />
                <stop offset="100%" stop-color="#556270" />
              </linearGradient>
            </defs>
            <!-- <path d="M40,35 L40,65 L60,50 Z" fill="currentColor"/>
            <path d="M65,35 L65,65 L85,50 Z" fill="currentColor"/> -->
            <!-- <path d="M60,60 C75,60 80,40 60,40" stroke="currentColor" stroke-width="2" fill="none"/> -->
            <!-- <path d="M40,60 C25,60 20,40 40,40" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M60,40 C75,40 80,60 60,60" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4,4"/> -->
            <text x="50" y="85" text-anchor="middle" fill="currentColor" font-size="100" font-weight="bold">∞</text>
          </svg>

          <svg v-if="timer.mode === TimerMode.Loop" class="icon" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF6B6B" />
                <stop offset="100%" stop-color="#C44D58" />
              </linearGradient>
            </defs>
            <path d="M30,15 L30,45 L50,30 Z" fill="currentColor"/>
            <path d="M55,15 L55,45 L75,30 Z" fill="currentColor"/>
            <text x="50" y="82" text-anchor="middle" fill="currentColor" font-size="34" font-weight="bold">{{ timer.playTimes }}x</text>
          </svg>

          <svg v-if="timer.mode === TimerMode.Once" class="icon" viewBox="0 0 100 100">
              <defs>
                  <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#FFE66D" />
                      <stop offset="100%" stop-color="#F7B733" />
                  </linearGradient>
              </defs>
              <path d="M30,35 L30,65 L50,50 Z" fill="currentColor"/>
              <path d="M55,35 L55,65 L75,50 Z" fill="currentColor"/>
              <!-- <text x="65" y="62" text-anchor="middle" fill="currentColor" font-size="34">1x</text> -->
          </svg>
        </button>
      </div>
      <div class="points-preview" v-if="timer.reportTime.length > 0">
        <canvas
          ref="timelineCanvas"
          class="points-timeline-canvas"
          @mousedown="onTimelineCanvasMouseDown"
          @mousemove="onTimelineCanvasMouseMove"
          @mouseleave="onTimelineCanvasMouseLeave"
          width="300"
          height="40">
        </canvas>
      </div>
      <div v-else class="no-points">
        暂无报时点，点击设置按钮添加
      </div>
    </div>
    <div class="debug" v-if="false">
      <span>
        name={{ timer.name }}<br/>
        cycleTime(周期)={{ timer.cycleTime }}<br/>
        mode(播放模式)={{ timer.getModeDisplayName() }}<br/>
        playTimes(播放次数, 仅在Loop模式生效)={{ timer.playTimes }}<br/>
      </span>
    </div>
    <Teleport
      :to="`body`"
    >
      <!-- <RenameModal
        v-model="showRenameModalFlag"
        :initial-name="props.timer.name"
        @confirm="rename"
      /> -->
      <TimerSettingModal
        v-model="showSettingModalFlag"
        :timer="props.timer"
        @save="saveTimerSettings"
      />
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, computed, onMounted, watch, nextTick } from 'vue'
import { Timer, TimerPoint, TimerMode } from '@/utils/timer'
import RenameModal from '@/components/RenameModal.vue';
import TimerSettingModal from '@/components/TimerSettingModal.vue';
import { dataManager } from '@/utils/dataManager';

const vFocus = {
  mounted: (el:any) => {
    el.focus();
  }
};

const props = defineProps({
  timer: {
    type: Timer,
    required: true
  }
})
const emits = defineEmits(['delete'])
defineExpose({
  forceUpdate
})

function forceUpdate() {
  props.timer.forceUpdate()
}

function openSetting() {
  showSettingModalFlag.value = true
}

const showRenameModalFlag = ref(false)
const showRenameModal = () => showRenameModalFlag.value = true
function rename(newName: string) {
  props.timer.name = newName
  showRenameModalFlag.value = false
  saveTimerSettings(props.timer)
  forceUpdate()
}

const showSettingModalFlag = ref(false)

// 播放状态
const playState = ref({
  isPlaying: false,
  currentTime: 0,
  currentCycle: 0,
  totalCycles: 0,
  startTime: 0 // 播放开始的时间戳
})

// 时间轴 canvas 相关状态
const timelineCanvas = ref<HTMLCanvasElement | null>(null)
const isDragging = ref(false)
const hoverTime = ref(-1)

// 计算属性
const progressPercentage = computed(() => {
  if (props.timer.cycleTime <= 0) return 0
  return Math.min(100, Math.max(0, (playState.value.currentTime / props.timer.cycleTime) * 100))
})

// 播放控制函数
const togglePlay = () => {
  if (playState.value.isPlaying) {
    pausePlay()
  } else {
    startPlay()
  }
}

const startPlay = () => {
  playState.value.isPlaying = true
  playState.value.startTime = Date.now() - playState.value.currentTime * 1000

  // 根据计时器模式设置播放参数
  const timerMode = props.timer.mode
  if (timerMode === TimerMode.Once) {
    playState.value.totalCycles = 1
  } else if (timerMode === TimerMode.Loop) {
    playState.value.totalCycles = props.timer.playTimes
  } else if (timerMode === TimerMode.Infinite) {
    playState.value.totalCycles = -1 // -1 表示无限循环
  }

  playState.value.currentCycle = 1

  // 开始播放循环
  playLoop()

  console.log(`开始播放计时器: ${props.timer.name}`)
}

const pausePlay = () => {
  playState.value.isPlaying = false
  console.log(`暂停播放计时器: ${props.timer.name}`)
  // TODO: 实现实际的暂停逻辑
}

const stopPlay = () => {
  playState.value.isPlaying = false
  playState.value.currentTime = 0
  playState.value.currentCycle = 0
  playState.value.totalCycles = 0
  playState.value.startTime = 0

  // 停止所有正在播放的音频
  stopAllAudio()

  console.log(`停止播放计时器: ${props.timer.name}`)
}

// 播放循环
const playLoop = () => {
  if (!playState.value.isPlaying) return

  // 更新当前时间
  const elapsed = (Date.now() - playState.value.startTime) / 1000
  const cycleTime = props.timer.cycleTime

  // 计算当前在哪个循环中
  const totalElapsed = elapsed
  const currentCycleTime = totalElapsed % cycleTime
  const completedCycles = Math.floor(totalElapsed / cycleTime)

  playState.value.currentTime = currentCycleTime

  // 检查是否完成了所有循环
  if (playState.value.totalCycles > 0 && completedCycles >= playState.value.totalCycles) {
    stopPlay()
    console.log(`播放完成 - 共播放了 ${playState.value.totalCycles} 次`)
    return
  }

  // 更新当前循环数
  playState.value.currentCycle = completedCycles + 1

  // 检查是否需要播放音频
  checkAndPlayAudio()

  // 继续播放循环
  requestAnimationFrame(playLoop)
}

// 检查并播放音频
const checkAndPlayAudio = () => {
  const currentTime = playState.value.currentTime

  props.timer.reportTime.forEach((timerPoint: TimerPoint) => {
    // 使用类型断言添加播放状态属性
    const timerPointWithState = timerPoint as TimerPoint & { hasPlayed?: boolean }

    // 检查是否应该在当前时间播放这个音频
    if (Math.abs(timerPoint.time - currentTime) < 0.1 && !timerPointWithState.hasPlayed) {
      playAudioByTimerPoint(timerPoint)
      timerPointWithState.hasPlayed = true
    }

    // 重置播放标记（当播放头回到音频之前时）
    if (currentTime < timerPoint.time - 0.1) {
      timerPointWithState.hasPlayed = false
    }
  })
}

// 根据 TimerPoint 播放音频
const playAudioByTimerPoint = async (timerPoint: TimerPoint) => {
  try {
    if (timerPoint.audioObj && timerPoint.audioObj.template) {
      const template = timerPoint.audioObj.template
      const { audioRetriever } = await import('@/utils/audioStorage')
      const audioElement = await audioRetriever.getPlayableAudio(template.audioId)

      if (audioElement) {
        await audioElement.play()
        console.log(`播放音频: ${template.name}`)
      }
    }
  } catch (error) {
    console.error('播放音频失败:', error)
  }
}

// 停止所有音频
const stopAllAudio = () => {
  props.timer.reportTime.forEach((timerPoint: TimerPoint) => {
    // 使用类型断言重置播放状态
    const timerPointWithState = timerPoint as TimerPoint & { hasPlayed?: boolean }
    timerPointWithState.hasPlayed = false
  })
}

// 格式化时间显示
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Canvas 时间轴事件处理
const onTimelineCanvasMouseDown = (event: MouseEvent) => {
  if (!timelineCanvas.value) return

  const rect = timelineCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100))
  const newTime = (percentage / 100) * props.timer.cycleTime

  // 更新播放时间
  playState.value.currentTime = newTime
  if (playState.value.isPlaying) {
    playState.value.startTime = Date.now() - newTime * 1000
  }

  isDragging.value = true

  // 重新绘制 canvas
  drawTimelineCanvas()

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', onTimelineDocumentMouseMove)
  document.addEventListener('mouseup', onTimelineDocumentMouseUp)
}

const onTimelineCanvasMouseMove = (event: MouseEvent) => {
  if (!timelineCanvas.value || isDragging.value) return

  const rect = timelineCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100))
  hoverTime.value = (percentage / 100) * props.timer.cycleTime

  // 重新绘制 canvas 显示悬停效果
  drawTimelineCanvas()
}

const onTimelineCanvasMouseLeave = () => {
  if (!isDragging.value) {
    hoverTime.value = -1
    drawTimelineCanvas()
  }
}

const onTimelineDocumentMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !timelineCanvas.value) return

  const rect = timelineCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100))
  const newTime = (percentage / 100) * props.timer.cycleTime

  // 更新播放时间
  playState.value.currentTime = newTime
  if (playState.value.isPlaying) {
    playState.value.startTime = Date.now() - newTime * 1000
  }

  hoverTime.value = newTime

  // 重新绘制 canvas
  drawTimelineCanvas()
}

const onTimelineDocumentMouseUp = () => {
  isDragging.value = false
  hoverTime.value = -1

  // 重新绘制 canvas
  drawTimelineCanvas()

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', onTimelineDocumentMouseMove)
  document.removeEventListener('mouseup', onTimelineDocumentMouseUp)
}

// 绘制时间轴 Canvas
const drawTimelineCanvas = () => {
  if (!timelineCanvas.value) return

  const canvas = timelineCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 设置 canvas 尺寸
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const width = rect.width
  const height = rect.height

  // 清空画布
  ctx.clearRect(0, 0, width, height)

  // 绘制背景
  ctx.fillStyle = '#2d2d30'
  ctx.fillRect(0, 0, width, height)

  // 绘制时间轴背景线
  ctx.strokeStyle = '#3e3e42'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  // 绘制报时点
  props.timer.reportTime.forEach((point: TimerPoint) => {
    const pointPosition = (point.time / props.timer.cycleTime) * width

    // 绘制报时点圆圈
    ctx.fillStyle = '#007acc'
    ctx.beginPath()
    ctx.arc(pointPosition, height / 2, 4, 0, 2 * Math.PI)
    ctx.fill()

    // 绘制报时点竖线
    ctx.strokeStyle = '#007acc'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pointPosition, height / 2 - 8)
    ctx.lineTo(pointPosition, height / 2 + 8)
    ctx.stroke()
  })

  // 绘制进度条竖线
  if (playState.value.isPlaying || playState.value.currentTime > 0) {
    const progressPosition = (playState.value.currentTime / props.timer.cycleTime) * width

    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(progressPosition, 0)
    ctx.lineTo(progressPosition, height)
    ctx.stroke()

    // 绘制进度条顶部小三角
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.moveTo(progressPosition - 4, 0)
    ctx.lineTo(progressPosition + 4, 0)
    ctx.lineTo(progressPosition, 8)
    ctx.closePath()
    ctx.fill()
  }

  // 绘制悬停指示器
  if (hoverTime.value >= 0) {
    const hoverPosition = (hoverTime.value / props.timer.cycleTime) * width

    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(hoverPosition, 0)
    ctx.lineTo(hoverPosition, height)
    ctx.stroke()
    ctx.setLineDash([])

    // 绘制时间提示
    const timeText = formatTime(hoverTime.value)
    ctx.fillStyle = '#1e1e1e'
    ctx.font = '12px Arial'
    const textWidth = ctx.measureText(timeText).width
    const tooltipX = Math.min(width - textWidth - 8, Math.max(4, hoverPosition - textWidth / 2))

    // 绘制提示框背景
    ctx.fillRect(tooltipX - 4, 2, textWidth + 8, 16)

    // 绘制提示框文字
    ctx.fillStyle = '#ffffff'
    ctx.fillText(timeText, tooltipX, 14)
  }
}

function saveTimerSettings(updatedTimer: Timer) {
  try {
    // 更新当前 timer 的设置
    props.timer.cycleTime = updatedTimer.cycleTime
    props.timer.mode = updatedTimer.mode
    props.timer.playTimes = updatedTimer.playTimes
    props.timer.reportTime = updatedTimer.reportTime
    props.timer.touch() // 更新修改时间

    // 保存到数据管理器
    dataManager.saveTimer(props.timer)

    forceUpdate()
    console.log(`计时器设置已保存: ${props.timer.name} (${props.timer.id})`)
  } catch (error) {
    console.error('保存计时器设置失败:', error)
    // 只在真正的错误情况下才显示 alert，而不是所有异常
    if (error instanceof Error && error.message.includes('存储')) {
      alert('保存失败，请重试')
    }
  }
}

// 生命周期钩子
onMounted(() => {
  nextTick(() => {
    drawTimelineCanvas()
  })
})

// 监听播放状态变化，更新 canvas
watch(() => playState.value.currentTime, () => {
  drawTimelineCanvas()
})

watch(() => playState.value.isPlaying, () => {
  drawTimelineCanvas()
})

// 监听报时点变化，更新 canvas
watch(() => props.timer.reportTime, () => {
  drawTimelineCanvas()
}, { deep: true })

</script>

<style scoped>
.timer {
  border: 1px solid var(--timer-card-border);
  background: var(--timer-card-bg);
  padding: 20px;
  margin: 15px;
  border-radius: 16px;
  box-shadow: 0 4px 12px var(--shadow-light);
  transition: var(--transition-normal);
}

.timer:hover .delete-button-box .delete-button {
  opacity: 1;
}

.timer:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--timer-card-hover-shadow);
}

.timer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.timer-title {
  cursor: pointer;
  width: 100%;
  padding-left: 0px;
  font-size: 14px;
  flex: 100;
  line-height: 34px;
  border-radius: 10px;
  transition: all 0.5s ease;
}

.timer-title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  transition: var(--transition-fast);
}

.timer-title:hover {
  padding-left: 10px;
  background-color: rgba(0, 0, 0, 0.13)
}

.timer-title-input {
  background-color: transparent;
  outline: none;
  border: none;

}

.timer-title:hover .timer-title-text {
  color: var(--text-accent);
}

.modern-btn {
  min-width: 40px;
}

.setting-button {
  padding: 7px;
}

.delete-button-box {
  min-width: 40px;
  flex: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.delete-button {
  opacity: 0;
}

.delete-button:hover {
  background: var(--btn-danger-bg);
  color: var(--bg-primary);
}

.timer-meta-quick-setting {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.timer-meta-quick-setting > .spacer {
  flex: 100;
}

/* Canvas 时间轴样式 */
.points-timeline-canvas {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  display: block;
}

.points-timeline-canvas:hover {
  border-color: var(--text-accent);
}

.timer-points-manager {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  min-height: 60px;
}

.points-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.points-count {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.points-timeline {
  position: relative;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(255, 145, 145, 0.3);
}

.point-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background-color: #ff6b6b;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.point-indicator:hover {
  transform: translate(-50%, -50%) scale(1.3);
  background-color: #ff5252;
}

.no-points {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  color: #999;
  font-size: 14px;
  font-style: italic;
}

.debug {
  margin-top: 10px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
</style>