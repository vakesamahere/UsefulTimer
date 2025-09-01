<template>
  <div :key="props.timer.rendering.forceUpdateKey.value">
    <div class="timer">
      <div class="timer-title" @click="showRenameModal()">
        <span class="timer-title-text">{{ timer.name }}</span>
      </div>
      <div class="timer-meta-quick-setting">
        <button
          title="click to toggle playing mode"
          class="toggle-play-button"
          @click="timer.toggleMode()"
        >
          {{ timer.getModeDisplayName() }}
        </button>
        <button class="setting-button" @click="openSetting()">...</button>
      </div>
      <div class="timer-points-manager"></div>
    </div>
    <div class="debug" v-if="true">
      <span>
        name={{ timer.name }}<br/>
        cycleTime(周期)={{ timer.cycleTime }}<br/>
        mode(播放模式)={{ timer.getModeDisplayName() }}<br/>
        playTimes(播放次数, 仅在Loop模式生效)={{ timer.playTimes }}<br/>
      </span>
    </div>
    <RenameModal
      v-model="showRenameModalFlag"
      :initial-name="props.timer.name"
      @confirm="rename"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, defineProps} from 'vue'
import { Timer } from '@/utils/timer'
import RenameModal from '@/components/RenameModal.vue';

const props = defineProps({
  timer: {
    type: Timer,
    required: true
  }
})
defineExpose({
  forceUpdate
})

function forceUpdate() {
  props.timer.forceUpdate()
}

function openSetting() {
  // TODO

  forceUpdate()
}

const showRenameModalFlag = ref(false)
const showRenameModal = () => showRenameModalFlag.value = true
function rename(newName: string) {
  props.timer.name = newName
  forceUpdate()
}

</script>

<style scoped>
.timer {
  border: 1px solid var(--timer-diaplay-border-color);
  background-color: var(--timer-diaplay-bg-color);
  padding: 10px;
  margin: 10px;
  border-radius: 10px;
}
.timer-title {
  cursor: pointer;
  width: 100%;
}
</style>