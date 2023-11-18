<script setup>
import { darkTheme, useOsTheme } from 'naive-ui'

const osThemeRef = useOsTheme()
const theme = computed(() => (osThemeRef.value === 'dark' ? darkTheme : null))
</script>

<template lang="pug">
n-config-provider(:theme="theme")
  router-view
</template>
