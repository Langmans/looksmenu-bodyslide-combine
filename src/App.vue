<script setup>
import * as remote from '@electron/remote'
import fs from 'fs'
import path from 'path'
import {computed, onMounted, ref} from 'vue'
import {computedAsync} from '@vueuse/core'
import FileSaver from 'file-saver/src/FileSaver'
import {downloadZip} from "client-zip";

import Button from 'primevue/button';
import Panel from 'primevue/panel';


const bodySlidePresetsDir = ref()
const looksMenuPresetsDir = ref()

const explorer = async (dir) => {
  await remote.shell.openPath(dir)
}

const bodySlidePresets = computedAsync(async () => {
  if (!bodySlidePresetsDir.value) return []
  const files = await fs.promises.readdir(bodySlidePresetsDir.value)
  let presets = []
  const domParser = new DOMParser()
  for (let file of files) {
    const ext = path.extname(file).toLowerCase()
    if (ext !== '.xml') continue
    const filePath = path.join(bodySlidePresetsDir.value, file)
    const content = await fs.promises.readFile(filePath, 'utf8')
    const doc = domParser.parseFromString(content, 'text/xml')

    const presetNodes = doc.querySelectorAll(':root:is(SliderPresets)>Preset')
    for (let presetNode of presetNodes) {
      const name = presetNode.getAttribute('name')
      let BodyMorphs = {}
      for (let childNode of presetNode.children) {
        if (childNode.tagName !== 'SetSlider') {
          continue;
        }
        BodyMorphs[childNode.getAttribute('name')] = childNode.getAttribute('value') / 100
      }
      presets.push({name, BodyMorphs})
    }
  }

  presets.sort((a, b) => /*a.fileName !== b.fileName
      ? a.fileName.localeCompare(b.fileName)
      : */a.name.localeCompare(b.name)
  )
  return presets;
})

const selectedBodySlidePreset = ref(null)


const selectBodySlidePresetsDir = async () => {
  let opts = {
    title: "Select Tools/BodySlide/SliderPresets Directory",
    properties: ['openDirectory']
  }
  if (bodySlidePresetsDir.value) {
    opts.defaultPath = bodySlidePresetsDir.value
  }
  const {canceled, filePaths} = await remote.dialog.showOpenDialog(opts)
  if (!canceled) {
    bodySlidePresetsDir.value = filePaths[0]
    selectedBodySlidePreset.value = null
    localStorage.setItem('bodySlidePresetsDir', filePaths[0])
  }
}

const looksMenuPresets = computedAsync(async () => {
  if (!looksMenuPresetsDir.value) return []
  const files = await fs.promises.readdir(looksMenuPresetsDir.value)
  let presets = []
  for (let file of files) {
    let ext = path.extname(file).toLowerCase()
    if (ext !== '.json') continue
    let name = path.basename(file, '.json')
    let filePath = path.join(looksMenuPresetsDir.value, file)
    let content = await fs.promises.readFile(filePath, 'utf8')
    try {
      let data = JSON.parse(content)
      presets.push({name, data})
    } catch (e) {
      console.error(e)
    }
  }

  presets.sort((a, b) => a.name.localeCompare(b.name))
  return presets;
})

const selectedLooksMenuPreset = ref(null)

const selectLooksMenuPresetsDir = async () => {
  let opts = {
    title: "Select F4SE/Plugins/F4EE/Presets Directory",
    properties: ['openDirectory']
  }
  if (looksMenuPresetsDir.value) {
    opts.defaultPath = looksMenuPresetsDir.value
  }
  const {canceled, filePaths} = await remote.dialog.showOpenDialog(opts)
  if (!canceled) {
    looksMenuPresetsDir.value = filePaths[0]
    selectedLooksMenuPreset.value = null
    localStorage.setItem('looksMenuPresetsDir', filePaths[0])
  }
}

const saveButtonsDisabled = computed(() => {
  return !selectedBodySlidePreset.value || !selectedLooksMenuPreset.value
})

const fileToSave = computed(() => {
  if (!selectedBodySlidePreset.value || !selectedLooksMenuPreset.value) return null
  const fileName = `${selectedLooksMenuPreset.value.name} {Body-${selectedBodySlidePreset.value.name}}.json`
  const data = {
    ...selectedLooksMenuPreset.value.data,
    BodyMorphs: selectedBodySlidePreset.value.BodyMorphs
  }
  const content = JSON.stringify(data, null, 2)
  return {fileName, content}
})
const save = async () => {
  await fs.promises.writeFile(path.join(looksMenuPresetsDir.value, fileToSave.value.fileName), fileToSave.value.content, 'utf8')
}

const download = async () => {
  FileSaver.saveAs(new Blob([fileToSave.value.content], {type: 'application/json'}), fileToSave.value.fileName)
}

const downloadAsZip = async () => {
  const blob = await downloadZip([{
    name: 'F4SE/Plugins/F4EE/Presets/' + fileToSave.value.fileName,
    input: fileToSave.value.content
  }]).blob()

  const fileName = `${selectedLooksMenuPreset.value.name} {Body-${selectedBodySlidePreset.value.name}}.zip`
  FileSaver.saveAs(blob, fileName)
}

onMounted(() => {
  bodySlidePresetsDir.value = localStorage.getItem('bodySlidePresetsDir')
  looksMenuPresetsDir.value = localStorage.getItem('looksMenuPresetsDir')
})
</script>

<template>
  <div class="grid">
    <Panel header="LooksMenu">
      <Button @click="selectLooksMenuPresetsDir" :title="looksMenuPresetsDir">
        Select Directory
      </Button>
      <Button severity="secondary" :disabled="!looksMenuPresetsDir" @click="explorer(looksMenuPresetsDir)">Explorer
      </Button>
      <pre>{{ looksMenuPresetsDir }}</pre>
      <select :disabled="!looksMenuPresetsDir" v-model="selectedLooksMenuPreset">
        <option :value="null">Choose &hellip;</option>
        <option v-for="preset in looksMenuPresets" :key="preset.name" :value="preset">{{ preset.name }}</option>
      </select>
    </Panel>

    <Panel header="BodySlide" style="flex-grow:1">
      <Button @click="selectBodySlidePresetsDir" :title="bodySlidePresetsDir">
        Select directory
      </Button>
      <Button severity="secondary" :disabled="!bodySlidePresetsDir" @click="explorer(bodySlidePresetsDir)">Explorer
      </Button>
      <pre>{{ bodySlidePresetsDir }}</pre>
      <select :disabled="!bodySlidePresetsDir" v-model="selectedBodySlidePreset">
        <option :value="null">Choose &hellip;</option>
        <option v-for="preset in bodySlidePresets" :key="preset.name" :value="preset">{{ preset.name }}</option>
      </select>
    </Panel>


    <div class="save-panel">
      <Panel>
        <div v-if="fileToSave">
          <output v-if="fileToSave">{{ fileToSave.fileName }}</output>
        </div>
        <Button @click="save" :disabled="saveButtonsDisabled">Save to LooksMenu Presets Directory</Button>
        <Button severity="secondary" @click="download" :disabled="saveButtonsDisabled">Download JSON</Button>
        <Button severity="secondary" @click="downloadAsZip" :disabled="saveButtonsDisabled">Download ZIP</Button>
      </Panel>
    </div>
  </div>
</template>
<style>
html, body {
  padding: 0;
  margin: 0;
  min-height: 100svh;
  font-family: sans-serif;
}
</style>

<style scoped>
pre {
  border: 1px solid #ccc;
  font-size: calc(12 / 16 * 1em);
  font-family: "Lucida Console", Monaco, monospace;
  padding: .5em;
  background-color: #f9f9f9;
  white-space: pre-wrap;
  max-height: calc(1em + (5 * 1.5em));
  overflow: auto;
}

.grid {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  padding: .5em;
  gap: 1em;
}

.grid > * {
  //padding: .5em;
}

.save-panel {
  grid-column: span 2;
}

@media (min-width: 768px) {
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr auto;
  }
}
</style>