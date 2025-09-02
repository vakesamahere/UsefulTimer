<template>
  <div class="modal-overlay" v-if="isVisible" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Audio Templates</h2>
        <button class="btn" @click="closeModal">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="template-list">
          <div class="list-header">
            <h3>Your Templates</h3>
            <button @click="addNewTemplate" class="btn">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
          </div>
          
          <div class="template-items">
            <div
              v-for="(template, index) in localTemplates"
              :key="template.uuid"
              class="template-item"
              :class="{ active: selectedTemplate?.uuid === template.uuid }"
              @click="selectTemplate(template)"
            >
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-src">{{ template.src || '未设置音频文件' }}</div>
              </div>
              <div class="template-actions">
                <button v-tooltip @click.stop="playTemplate(template)" class="btn play-btn" title="试听">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.86 3.14-7 7-7s7 3.14 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
                  </svg>
                </button>
                <button v-tooltip @click.stop="editTemplate(template)" class="btn play-btn" title="编辑">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.09-.77-1.74-1.07L14 2.1c-.09-.48-.5-.81-1-.81h-4c-.5 0-.91.33-1 .81L7.54 5.1c-.65.3-1.22.67-1.74 1.07l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.09.77 1.74 1.07L9 21.9c.09.48.5.81 1 .81h4c.5 0 .91-.33 1-.81l.46-2.58c.65-.3 1.22-.67 1.74-1.07l2.49 1c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                  </svg>
                </button>
                <button v-tooltip @click.stop="deleteTemplate(index)" class="btn play-btn" title="删除">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
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
                <button v-tooltip @click="selectAudioFile" class="btn" title="从本地选择音频文件">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6C4.89,2 4,2.89 4,4V20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20V8L14,2Z" />
                  </svg>
                </button>
                <button v-tooltip @click="inputAudioUrl" class="btn" title="从URL导入音频">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16.92c-3.5-.32-6.27-3.23-6.27-6.92 0-.96.22-1.89.62-2.73l4.65 8.16-.94 1.49zm2-.01l-.94-1.49 4.65-8.16c.4.84.62 1.77.62 2.73 0 3.69-2.77 6.6-6.27 6.92zM12 18V6c3.69 0 6.6 2.77 6.92 6.27-.32 3.5-3.23 6.27-6.92 6.27z" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="presetSounds.length > 0" class="form-group">
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
              <button @click="testPlay" class="btn">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.86 3.14-7 7-7s7 3.14 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
                </svg>
              </button>
              <button @click="saveTemplate" class="btn">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="saveAllTemplates" class="btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
          </svg>
        </button>
        <button @click="closeModal" class="btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
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
const presetSounds: {name: string; src: string}[] = [
];

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    // 深拷贝模板数组，保持原有的 UUID
    localTemplates.value = props.templates.map(template => {
      const newTemplate = new AudioObjTemplate(template.name, template.src);
      newTemplate.uuid = template.uuid; // 保持原有的 UUID
      newTemplate.audioId = template.audioId; // 保持原有的 audioId
      newTemplate.createdAt = template.createdAt; // 保持原有的创建时间
      newTemplate.updatedAt = template.updatedAt; // 保持原有的更新时间
      return newTemplate;
    });
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
  // if (confirm('确定要删除这个模板吗？')) {
  const deletedTemplate = localTemplates.value[index];

  // 从本地数组中删除
  localTemplates.value.splice(index, 1);

  // 从数据管理器中删除
  if (deletedTemplate.uuid) {
    dataManager.deleteAudioTemplate(deletedTemplate.uuid);
    console.log(`已从数据管理器删除音频模板: ${deletedTemplate.name} (${deletedTemplate.uuid})`);
  }

  // 清除选中状态
  if (selectedTemplate.value === deletedTemplate) {
    selectedTemplate.value = null;
  }
  // }
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
  background-color: var(--play-btn-hover);
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #444;
}
</style>
