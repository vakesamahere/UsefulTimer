<template>
  <div class="modal-overlay" v-if="isVisible" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>声音模板管理</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <div class="template-list">
          <div class="list-header">
            <h3>现有模板</h3>
            <button @click="addNewTemplate" class="add-btn">+ 添加模板</button>
          </div>
          
          <div class="template-items">
            <div 
              v-for="(template, index) in localTemplates" 
              :key="index"
              class="template-item"
              :class="{ active: selectedTemplate?.name === template.name }"
              @click="selectTemplate(template)"
            >
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-src">{{ template.src || '未设置音频文件' }}</div>
              </div>
              <div class="template-actions">
                <button @click.stop="playTemplate(template)" class="play-btn" title="试听">
                  🔊
                </button>
                <button @click.stop="editTemplate(template)" class="edit-btn" title="编辑">
                  ✏️
                </button>
                <button @click.stop="deleteTemplate(index)" class="delete-btn" title="删除">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="template-editor" v-if="selectedTemplate">
          <h3>编辑模板</h3>
          <div class="editor-form">
            <div class="form-group">
              <label>模板名称:</label>
              <input 
                v-model="selectedTemplate.name" 
                type="text" 
                placeholder="请输入模板名称"
              />
            </div>
            <div class="form-group">
              <label>音频文件:</label>
              <div class="file-input-group">
                <input 
                  v-model="selectedTemplate.src" 
                  type="text" 
                  placeholder="音频文件路径或URL"
                />
                <button @click="selectAudioFile" class="file-select-btn">选择文件</button>
                <button @click="inputAudioUrl" class="url-input-btn">输入URL</button>
              </div>
            </div>
            <div class="form-group">
              <label>预设音频:</label>
              <div class="preset-sounds">
                <button 
                  v-for="preset in presetSounds" 
                  :key="preset.name"
                  @click="usePresetSound(preset)"
                  class="preset-btn"
                >
                  {{ preset.name }}
                </button>
              </div>
            </div>
            <div class="form-actions">
              <button @click="testPlay" class="test-btn">试听</button>
              <button @click="saveTemplate" class="save-template-btn">保存模板</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="saveAllTemplates" class="save-btn">保存所有更改</button>
        <button @click="closeModal" class="cancel-btn">取消</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { AudioObjTemplate } from '@/utils/timer';
import { audioDownloader } from '@/utils/audioDownloader';
import { audioRetriever } from '@/utils/audioStorage';
import { dataManager } from '@/utils/dataManager';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  templates: {
    type: Array as () => AudioObjTemplate[],
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const isVisible = ref(false);
const localTemplates = ref<AudioObjTemplate[]>([]);
const selectedTemplate = ref<AudioObjTemplate | null>(null);

// 预设音频
const presetSounds = [
  { name: '默认提示音', src: '/sounds/default.mp3' },
  { name: '铃声', src: '/sounds/bell.mp3' },
  { name: '蜂鸣声', src: '/sounds/beep.mp3' },
  { name: '叮咚声', src: '/sounds/ding.mp3' },
  { name: '警报声', src: '/sounds/alarm.mp3' },
];

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    // 深拷贝模板数组
    localTemplates.value = props.templates.map(template => 
      new AudioObjTemplate(template.name, template.src)
    );
    selectedTemplate.value = null;
  }
});

const closeModal = () => {
  emit('update:modelValue', false);
  selectedTemplate.value = null;
};

const addNewTemplate = () => {
  const newTemplate = new AudioObjTemplate('新模板', '');
  localTemplates.value.push(newTemplate);
  selectedTemplate.value = newTemplate;
};

const selectTemplate = (template: AudioObjTemplate) => {
  selectedTemplate.value = template;
};

const editTemplate = (template: AudioObjTemplate) => {
  selectedTemplate.value = template;
};

const deleteTemplate = (index: number) => {
  if (confirm('确定要删除这个模板吗？')) {
    const deletedTemplate = localTemplates.value[index];
    localTemplates.value.splice(index, 1);
    if (selectedTemplate.value === deletedTemplate) {
      selectedTemplate.value = null;
    }
  }
};

const playTemplate = async (template: AudioObjTemplate) => {
  if (template.audioId) {
    try {
      console.log(`播放音频模板: ${template.name} (${template.audioId})`);

      // 使用音频获取器获取可播放的音频对象
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
  } else {
    alert('请先设置音频文件');
  }
};

const selectAudioFile = async () => {
  try {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file && selectedTemplate.value) {
        try {
          console.log(`开始上传音频文件: ${file.name}`);

          // 使用音频下载器上传文件到音频存储
          const audioId = await audioDownloader.uploadFromFile(file);

          // 更新模板的音频ID
          selectedTemplate.value.audioId = audioId;
          selectedTemplate.value.touch(); // 更新修改时间

          // 保存模板到数据管理器
          dataManager.saveAudioTemplate(selectedTemplate.value);

          console.log(`音频文件上传成功: ${file.name} -> ${audioId}`);
          alert('音频文件上传成功！');
        } catch (error) {
          console.error('上传音频文件失败:', error);
          alert('上传音频文件失败，请检查文件格式');
        }
      }
    };

    input.click();
  } catch (error) {
    console.error('打开文件选择器失败:', error);
  }
};

const usePresetSound = async (preset: { name: string; src: string }) => {
  if (selectedTemplate.value) {
    try {
      console.log(`开始下载预设音频: ${preset.name} from ${preset.src}`);

      // 使用音频下载器从URL下载音频
      const audioId = await audioDownloader.downloadFromUrl(preset.src, preset.name);

      // 更新模板的音频ID
      selectedTemplate.value.audioId = audioId;
      selectedTemplate.value.touch(); // 更新修改时间

      // 保存模板到数据管理器
      dataManager.saveAudioTemplate(selectedTemplate.value);

      console.log(`预设音频下载成功: ${preset.name} -> ${audioId}`);
      alert('预设音频设置成功！');
    } catch (error) {
      console.error('下载预设音频失败:', error);
      alert('下载音频失败，请检查网络连接或URL是否正确');
    }
  }
};

// 添加 URL 输入功能
const inputAudioUrl = async () => {
  if (!selectedTemplate.value) {
    alert('请先选择一个模板');
    return;
  }

  const url = prompt('请输入音频文件的URL:');
  if (url && url.trim()) {
    try {
      console.log(`开始从URL下载音频: ${url}`);

      // 使用音频下载器从URL下载音频
      const audioId = await audioDownloader.downloadFromUrl(url.trim());

      // 更新模板的音频ID
      selectedTemplate.value.audioId = audioId;
      selectedTemplate.value.touch(); // 更新修改时间

      // 保存模板到数据管理器
      dataManager.saveAudioTemplate(selectedTemplate.value);

      console.log(`URL音频下载成功: ${url} -> ${audioId}`);
      alert('音频URL设置成功！');
    } catch (error) {
      console.error('从URL下载音频失败:', error);
      alert('下载失败，请检查URL是否正确或网络连接');
    }
  }
};

const testPlay = async () => {
  if (selectedTemplate.value && selectedTemplate.value.audioId) {
    try {
      console.log(`开始播放音频: ${selectedTemplate.value.name} (${selectedTemplate.value.audioId})`);

      // 使用音频获取器获取可播放的音频对象
      const audioElement = await audioRetriever.getPlayableAudio(selectedTemplate.value.audioId);

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
  } else {
    alert('请先选择音频文件');
  }
};

const saveTemplate = () => {
  if (selectedTemplate.value && selectedTemplate.value.name.trim()) {
    // 模板已经在数组中，无需额外操作
    alert('模板保存成功');
  } else {
    alert('请输入模板名称');
  }
};

const saveAllTemplates = () => {
  emit('save', localTemplates.value);
  closeModal();
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #444;
}

.modal-header h2 {
  margin: 0;
  color: #ffffff;
}

.close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #ff4444;
  border-radius: 50%;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  gap: 20px;
}

.template-list {
  flex: 1;
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  color: #ffffff;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.template-items {
  max-height: 300px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background-color: #444;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.template-item:hover {
  background-color: #555;
}

.template-item.active {
  background-color: #2196F3;
}

.template-info {
  flex: 1;
}

.template-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.template-src {
  font-size: 12px;
  color: #ccc;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.template-actions button {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.play-btn:hover {
  background-color: #4CAF50;
}

.edit-btn:hover {
  background-color: #2196F3;
}

.delete-btn:hover {
  background-color: #f44336;
}

.template-editor {
  flex: 1;
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
}

.template-editor h3 {
  margin: 0 0 15px 0;
  color: #ffffff;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #cccccc;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #444;
  color: #ffffff;
}

.file-input-group {
  display: flex;
  gap: 8px;
}

.file-input-group input {
  flex: 1;
}

.file-select-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.preset-sounds {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  background-color: #666;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.preset-btn:hover {
  background-color: #777;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.test-btn {
  background-color: #FF9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.save-template-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #444;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #666;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
