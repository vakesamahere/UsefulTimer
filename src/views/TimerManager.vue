<template>
  <div class="home">
    <div class="header">
      Header: Timer Manager
    </div>
    <div class="main-content">
      <div class="timer-list" :key="timerListUpdateKey">
        <TimerDispaly
          v-for="timer in timerList"
          :key="timer.id"
          :timer="timer"
          :ref="(el) => { if (el) timerDisplays.push(el) }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue';

import { Timer } from '@/utils/timer';
import TimerDispaly from '@/components/TimerDisplay.vue';

const timerList: Timer[] = [];
const timerDisplays: Ref<any[]> = ref([]);

const timerListUpdateKey = ref(0);
const updateTimerList = () => { timerListUpdateKey.value++; };

onMounted(() => {
  const exampleTimer = new Timer();
  timerList.push(exampleTimer);
  timerList.forEach((timer) => {
    timer.forceUpdate();
  });
  updateTimerList()
});

</script>