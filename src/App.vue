<script setup>
import * as remote from '@electron/remote'
import fs from 'fs'
import path from 'path'
import {computed, onMounted, ref, watch} from 'vue'
import {computedAsync} from '@vueuse/core'
import FileSaver from 'file-saver/src/FileSaver'
import {downloadZip} from "client-zip";

import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Panel from "primevue/panel";
import InputGroup from "primevue/inputgroup";
import InputText from "primevue/inputtext";
import {PrimeIcons} from 'primevue/api';

const bodySlidePresetsDir = ref()
const looksMenuPresetsDir = ref()

const defaultFileNameTemplate = '[LooksMenuPresetName] {[BodySlidePresetName]}.json'
const fileNameTemplate = ref()

watch(fileNameTemplate, (val) => {
  if (val) {
    localStorage.setItem('fileNameTemplate', val)
  }
})

const resetFileNameTemplate = () => {
  console.log('resetFileNameTemplate')
  fileNameTemplate.value = defaultFileNameTemplate
}

const openPath = async (dir) => {
  await remote.shell.openPath(dir)
}

const showItemInFolder = async (filePath) => {
  await remote.shell.showItemInFolder(filePath)
}

const getBodySlideMorphPresetsFromContent = (content) => {
  const domParser = new DOMParser()
  let presets = []
  const doc = domParser.parseFromString(content, 'text/xml')

  const presetNodes = doc.querySelectorAll(':root:is(SliderPresets)>Preset')
  for (let presetNode of presetNodes) {
    const name = presetNode.getAttribute('name')
    const set = presetNode.getAttribute('set')
    let BodyMorphs = {}
    for (let childNode of presetNode.children) {
      if (childNode.tagName !== 'SetSlider') {
        continue;
      }
      BodyMorphs[childNode.getAttribute('name')] = childNode.getAttribute('value') / 100
    }
    presets.push({name, set, BodyMorphs})
  }

  return presets
}

const bodySlidePresets = computedAsync(async () => {
  if (!bodySlidePresetsDir.value) return []
  const files = await fs.promises.readdir(bodySlidePresetsDir.value)

  let sets = {}

  for (let file of files) {
    let ext = path.extname(file).toLowerCase()
    if (ext !== '.xml') continue
    let filename = path.basename(file, '.xml')
    let filePath = path.join(bodySlidePresetsDir.value, file)
    let content = await fs.promises.readFile(filePath, 'utf8')

    try {
      const presets = getBodySlideMorphPresetsFromContent(content)
      presets.forEach(({name, set, BodyMorphs}) => {
        set = set ?? filename
        if (!sets[set]) {
          sets[set] = []
        }
        sets[set].push({name, BodyMorphs})
      })
    } catch (e) {
      console.error(e)
    }
  }

  // console.log({sets})
  let presets = Object.entries(sets).map(([name, presets]) => {
    presets.sort((a, b) => a.name.localeCompare(b.name))
    return {name, presets}
  })

  presets.sort((a, b) => a.name.localeCompare(b.name))
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
  if (!selectedBodySlidePreset.value || !selectedLooksMenuPreset.value || !fileNameTemplate.value) return null
  // const fileName = `${selectedLooksMenuPreset.value.name} {Body-${selectedBodySlidePreset.value.name}}.json`
  const fileName = fileNameTemplate.value
      .replace(/\[LooksMenuPresetName]/g, selectedLooksMenuPreset.value.name)
      .replace(/\[BodySlidePresetName]/g, selectedBodySlidePreset.value.name)
  const data = {
    ...selectedLooksMenuPreset.value.data,
    BodyMorphs: selectedBodySlidePreset.value.BodyMorphs
  }
  const content = JSON.stringify(data, null, 2)
  return {fileName, content}
})

const save = async () => {
  const filepath = path.join(looksMenuPresetsDir.value, fileToSave.value.fileName)
  await fs.promises.writeFile(filepath, fileToSave.value.content, 'utf8')
  await showItemInFolder(filepath)
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
  fileNameTemplate.value = localStorage.getItem('fileNameTemplate') ?? defaultFileNameTemplate
})
</script>

<template>
  <div class="flex flex-col gap-2 p-2">

    <Panel header="LooksMenu">
      <div class="flex flex-wrap gap-2">
        <InputGroup>
          <InputText :value="looksMenuPresetsDir??''" class="truncate-left"/>
          <Button @click="selectLooksMenuPresetsDir" :title="looksMenuPresetsDir" v-tooltip="'Select directory'"
                  class="shrink-0" :icon="PrimeIcons.FOLDER"/>
          <Button severity="secondary" :disabled="!looksMenuPresetsDir" @click="openPath(looksMenuPresetsDir)"
                  :icon="PrimeIcons.FOLDER_OPEN"
                  v-tooltip="'Open in File Manager'"
          />
        </InputGroup>
        <Dropdown :disabled="!looksMenuPresetsDir" v-model="selectedLooksMenuPreset" :options="looksMenuPresets"
                  optionLabel="name" placeholder="Choose &hellip;" class="w-full"
                  filter
        />
      </div>
    </Panel>

    <Panel header="BodySlide">
      <div class="flex flex-wrap gap-2">
        <InputGroup>
          <InputText :value="bodySlidePresetsDir??''" class="truncate-left"/>
          <Button @click="selectLooksMenuPresetsDir" :title="bodySlidePresetsDir" v-tooltip="'Select directory'"
                  class="shrink-0" :icon="PrimeIcons.FOLDER"/>
          <Button severity="secondary" :disabled="!bodySlidePresetsDir" @click="openPath(bodySlidePresetsDir)"
                  :icon="PrimeIcons.FOLDER_OPEN"
                  v-tooltip="'Open in File Manager'"
          />
        </InputGroup>
        <Dropdown :disabled="!bodySlidePresetsDir" v-model="selectedBodySlidePreset" :options="bodySlidePresets"
                  option-label="name" option-group-label="name" option-group-children="presets"
                  filter placeholder="Choose &hellip;" class="w-full"/>
      </div>
    </Panel>

    <Panel header="Filename">
      <InputGroup>
        <InputText v-model="fileNameTemplate" placeholder="Filename Template" class="truncate-left"/>
        <Button @click="resetFileNameTemplate" :icon="PrimeIcons.REFRESH"
                v-if="fileNameTemplate!==defaultFileNameTemplate"/>
      </InputGroup>
    </Panel>

    <Panel header="Save">
      <div>
        <InputGroup>
          <InputText :disabled="!fileToSave" readonly :value="fileToSave ? fileToSave.fileName:null"
                     class="truncate-left"/>

          <Button @click="save" :disabled="saveButtonsDisabled" :icon="PrimeIcons.SAVE"
                  :title="'Save to LooksMenu Presets Directory'" label="Save"></Button>
          <Button severity="secondary" @click="download" :disabled="saveButtonsDisabled" :icon="PrimeIcons.DOWNLOAD"
                  label="JSON"></Button>
          <Button severity="secondary" @click="downloadAsZip" :disabled="saveButtonsDisabled"
                  :icon="PrimeIcons.DOWNLOAD"
                  label="ZIP"></Button>
        </InputGroup>
      </div>
    </Panel>
  </div>
</template>

<style scoped></style>