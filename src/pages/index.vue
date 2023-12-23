<script setup>

</script>

<template lang="pug">
n-grid.p-4(x-gap="12" :cols="4")
  n-gi(v-for="menuOption in menuOptions")
    component.text-3xl.py-8.relative.block.text-center.border.border-white.rounded(:is="menuOption.label")
</template>
