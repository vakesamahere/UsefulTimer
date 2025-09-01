<template>
  <div class="modal-overlay" v-if="isVisible">
    <div class="modal-content">
      <div>Enter a new name for me</div>
      <input type="text" v-model="inputValue" @keyup.enter="confirm" />
      <div class="modal-actions">
        <button @click="confirm">确定</button>
        <button @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const props = defineProps({
  // 模态框的显示状态
  modelValue: {
    type: Boolean,
    required: true
  },
  // 输入框的初始值
  initialName: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const inputValue = ref('');
const isVisible = ref(false);

// 监听父组件传来的 modelValue，控制模态框的显示
watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    inputValue.value = props.initialName;
  }
});

const confirm = () => {
  // 发出 confirm 事件，并传递用户输入的新值
  emit('confirm', inputValue.value);
  closeModal();
};

const cancel = () => {
  closeModal();
};

const closeModal = () => {
  // 通知父组件隐藏模态框
  emit('update:modelValue', false);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

input {
  display: block;
  margin: 10px 0;
  padding: 8px;
  width: 200px;
}

.modal-actions {
  text-align: right;
}
</style>