<script setup lang="ts" generic="T extends any, O extends any">
import { startOfMonth, startOfQuarter, startOfYear, format as formatDate } from 'date-fns';
import { chain, sumBy } from 'lodash';
import { type FormItemRule, type FormInst } from 'naive-ui'
import { v4 as uuidv4 } from 'uuid';

defineOptions({
  name: 'IndexPage',
})

type CustomerAccount = {
  customerName: string,
  items: CustomerAccountItem[],
}

type CustomerAccountItem = {
  id: string
  invoiceDate: number | null,
  invoiceNo: string,
  lpoDate: number | null,
  lpo: string,
  invoiceAmount: number,
  chequeDate: number | null,
  chequeNo: string,
  chequeAmount: number,
  remark: string,
}

const customerRecords = useLocalStorage('governmentRecords', {
  version: '1.0.0',
  customerAccounts: [] as CustomerAccount[],
  selectedCustomerName: null as string | null,
}, { writeDefaults: true })

const customersOption = computed(() =>
  customerRecords.value.customerAccounts.map((customerAccount) => ({
    label: customerAccount.customerName,
    value: customerAccount.customerName,
  })).sort((a, b) => a.label.localeCompare(b.label))
)

const customerAccount = computed(() => {
  const customerName = customerRecords.value.selectedCustomerName
  if (!customerName)
    return null
  const customerAccount = customerRecords.value.customerAccounts.find((customerAccount) => customerAccount.customerName === customerName)
  if (!customerAccount)
    return null
  return customerAccount
})

const yearFilter = ref(new Date().getFullYear())

watch(() => customerAccount.value?.items, (items) => {
  if (!items) return
  items.sort((a, b) => (a.invoiceDate || Infinity) - (b.invoiceDate || Infinity))
}, { deep: true })


function addItem() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!customerAccount.value) return
  customerAccount.value.items.push({
    id: uuidv4(),
    invoiceDate: null,
    invoiceNo: '',
    lpoDate: null,
    lpo: '',
    invoiceAmount: 0,
    chequeDate: null,
    chequeNo: '',
    chequeAmount: 0,
    remark: '',
  })
}

const addCustomerForm = ref({
  customerName: '',
  show: false
})

function showAddCustomerForm() {
  addCustomerForm.value.customerName = ''
  addCustomerForm.value.show = true
}

const addCustomerRule = {
  customerName: [
    {
      required: true,
      trigger: ['input', 'blur'],
      validator(rule: FormItemRule, value: string) {
        if (!value) {
          return new Error('Customer Name is required')
        } else if (customerRecords.value.customerAccounts.find((customerAccount) => customerAccount.customerName === value)) {
          return new Error('Customer Name already exists')
        }
        return true
      }
    },
  ],
}

const addCustomerFormRef = ref<FormInst>()

async function addCustomer() {
  addCustomerFormRef.value?.validate((errors) => {
    if (errors) return
    addCustomerForm.value.show = false
    const customerName = addCustomerForm.value.customerName
    if (!customerName) return
    customerRecords.value.customerAccounts.push({
      customerName,
      items: [],
    })
    customerRecords.value.selectedCustomerName = customerName
  })
}


const updateCustomerForm = ref({
  customerName: '',
  show: false
})

function showUpdateCustomerForm() {
  updateCustomerForm.value.customerName = customerRecords.value.selectedCustomerName || ''
  updateCustomerForm.value.show = true
}

const updateCustomerRule = {
  customerName: [
    {
      required: true,
      trigger: ['input', 'blur'],
      validator(rule: FormItemRule, value: string) {
        if (!value) {
          return new Error('Customer Name is required')
        } else if (customerRecords.value.customerAccounts.find((customerAccount) => customerAccount.customerName === value)) {
          if (value === customerRecords.value.selectedCustomerName)
            return true
          else
            return new Error('Customer Name already exists')
        }
        return true
      }
    },
  ],
}

const updateCustomerFormRef = ref<FormInst>()

async function updateCustomer() {
  updateCustomerFormRef.value?.validate((errors) => {
    if (errors) return
    updateCustomerForm.value.show = false
    const customerName = updateCustomerForm.value.customerName
    if (!customerName) return
    if (!customerAccount.value) return
    customerAccount.value.customerName = customerName
    customerRecords.value.selectedCustomerName = customerName
  })
}

function deleteCustomer() {
  const customerName = customerRecords.value.selectedCustomerName
  if (!customerName) return
  const index = customerRecords.value.customerAccounts.findIndex((customerAccount) => customerAccount.customerName === customerName)
  if (index === -1) return
  customerRecords.value.customerAccounts.splice(index, 1)
  customerRecords.value.selectedCustomerName = null
}


function removeItem(index: number) {
  customerAccount.value?.items.splice(index, 1)
}

const draggableRow = ref<number>()
useEventListener('mouseup', () => {
  draggableRow.value = -1
})
const draggingIndex = ref(-1)

function dropItem(index: number) {
  const items = customerAccount.value?.items
  if (!items) return
  const draggingTransaction = items[draggingIndex.value]
  items.splice(draggingIndex.value, 1)
  items.splice(index, 0, draggingTransaction)
}

const invoiceDateFilter = ref<[number, number]>()
const chequeDateFilter = ref<[number, number]>()
const lpoDateFilter = ref<[number, number]>()

const filteredCustomerItems = computed(() => {
  if (!customerAccount.value) return []
  const items = customerAccount.value.items.filter(item => !item.lpoDate || startOfYear(item.lpoDate).getFullYear() === yearFilter.value)
  if (!invoiceDateFilter.value && !chequeDateFilter.value) return items
  return items.filter(item => {
    if (invoiceDateFilter.value) {
      if (!item.invoiceDate) return false
      if (item.invoiceDate < invoiceDateFilter.value[0] || item.invoiceDate > invoiceDateFilter.value[1]) return false
    }
    if (chequeDateFilter.value) {
      if (!item.chequeDate) return false
      if (item.chequeDate < chequeDateFilter.value[0] || item.chequeDate > chequeDateFilter.value[1]) return false
    }
    if (lpoDateFilter.value) {
      if (!item.lpoDate) return false
      if (item.lpoDate < lpoDateFilter.value[0] || item.lpoDate > lpoDateFilter.value[1]) return false
    }
    return true
  })
})

const showStatisticModal = ref(false)
const statisticAmountType = ref<'invoice' | 'cheque'>('invoice')

const statisticPeriodType = ref<'all' | 'monthly' | 'quarterly' | 'yearly'>('all')
const statisticMonthlyPeriod = ref<number | null>()
const statisticQuarterlyPeriod = ref<number | null>()
const statisticYearlyPeriod = ref<number | null>()

const statisticPeriodOptions = computed(() => {
  const monthly = chain(customerRecords.value.customerAccounts)
    .flatMap(customerAccount => customerAccount.items)
    .map(item => {
      if (statisticAmountType.value === 'invoice')
        return item.invoiceDate && startOfMonth(item.invoiceDate).getTime()
      return item.chequeDate && startOfMonth(item.chequeDate).getTime()
    })
    .compact()
    .uniq()
    .sortBy()
    .value()

  const quarterly = chain(monthly)
    .map(date => startOfQuarter(date).getTime())
    .uniq()
    .value()

  const yearly = chain(monthly)
    .map(date => startOfYear(date).getTime())
    .uniq()
    .value()

  return {
    monthly: monthly.map(date => ({
      label: formatDate(new Date(date), 'yyyy-MM'),
      value: date,
    })),
    quarterly: quarterly.map(date => ({
      label: formatDate(new Date(date), 'yyyy-QQQ'),
      value: date,
    })),
    yearly: yearly.map(date => ({
      label: formatDate(new Date(date), 'yyyy'),
      value: date,
    })),
  }
})


const statistic = computed(() => {
  switch (statisticPeriodType.value) {
    case 'all':
      break;
    case 'monthly':
      if (!statisticMonthlyPeriod.value) return null
      break;
    case 'quarterly':
      if (!statisticQuarterlyPeriod.value) return null
      break;
    case 'yearly':
      if (!statisticYearlyPeriod.value) return null
      break;
  }

  const customers = chain(customerRecords.value.customerAccounts)
    .map((customerAccount) => {
      return {
        customerName: customerAccount.customerName,
        totalAmount: sumBy(customerAccount.items, item => {

          if (statisticAmountType.value === 'invoice') {
            if (!item.invoiceDate) return 0
            switch (statisticPeriodType.value) {
              case 'all':
                break;
              case 'monthly':
                if (statisticMonthlyPeriod.value !== startOfMonth(item.invoiceDate).getTime()) return 0
                break;
              case 'quarterly':
                if (statisticQuarterlyPeriod.value !== startOfQuarter(item.invoiceDate).getTime()) return 0
                break;
              case 'yearly':
                if (statisticYearlyPeriod.value !== startOfYear(item.invoiceDate).getTime()) return 0
                break;
            }
            return item.invoiceAmount
          }
          else {
            if (!item.chequeDate) return 0
            switch (statisticPeriodType.value) {
              case 'all':
                break;
              case 'monthly':
                if (statisticMonthlyPeriod.value !== startOfMonth(item.chequeDate).getTime()) return 0
                break;
              case 'quarterly':
                if (statisticQuarterlyPeriod.value !== startOfQuarter(item.chequeDate).getTime()) return 0
                break;
              case 'yearly':
                if (statisticYearlyPeriod.value !== startOfYear(item.chequeDate).getTime()) return 0
                break;
            }
            return item.chequeAmount
          }
        })
      }
    })
    .sortBy(item => -item.totalAmount)
    .value()

  const totalAmount = sumBy(customers, item => item.totalAmount)

  return {
    customers,
    totalAmount,
  }
})

const showPendingInvoicesModal = ref(false)
const pendingInvoices = computed(() => {
  const customers = customerRecords.value.customerAccounts
    .map(customerAccount => ({
      customerName: customerAccount.customerName,
      items: customerAccount.items.filter(item => !item.chequeDate)
    }))
    .filter(customerAccount => customerAccount.items.length)

  const count = sumBy(customers, customerAccount => customerAccount.items.length)
  return {
    customers,
    count,
  }
})

function download() {
  const element = document.createElement('a')
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(customerRecords.value))}`)
  const nowDate = new Date()
  const now = `${nowDate.getFullYear()}-${(nowDate.getMonth() + 1).toString().padStart(2, '0')}-${nowDate.getDate().toString().padStart(2, "0")} ${nowDate.getHours().toString().padStart(2, '0')}-${nowDate.getMinutes().toString().padStart(2, '0')}-${nowDate.getSeconds().toString().padStart(2, '0')}`
  element.setAttribute('download', `customers ${now}.json`)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}

function upload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = () => {
    if (input.files?.length) {
      const file = input.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        try {
          customerRecords.value = JSON.parse(text)
        }
        catch (e) {
          alert('Invalid JSON')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

</script>

<template lang="pug">
.mx-8.flex.flex-col.h-screen.gap-y-2
  h1.gap-x-2.py-1(text="4xl" flex items-center)
    n-popover(:show-arrow="false")
      template(#trigger) Customer Records (Government)
      n-menu(:options="menuOptions")
    span
    n-popconfirm(@positive-click="upload()")
      div
        div Restore customer records from a file?
        div All unsaved changes will be lost.
        div Please backup your customer records before restoring.
      template(#trigger)
        n-button(type="info") #[.i-carbon-upload] Restore
    n-button(@click="download()" type="success") #[.i-carbon-download] Backup
    n-button(@click="showStatisticModal=true" type="warning") #[.i-carbon-chart-bar] Statistics
    n-tooltip(:disabled="!!pendingInvoices.count") You have no pending invoices.
      template(#trigger)
        n-badge(:value="pendingInvoices.count" type="error")
          n-button(@click="showPendingInvoicesModal=true" type="error" :disabled="!pendingInvoices.count") #[.i-carbon-document] Pending Invoices
  .flex.gap-x-2.py-2.items-center
    .text-xl Year:
    n-input-number.font-mono(v-model:value="yearFilter" min="1900" max="3000" style="width: 180px; min-width: 180px;" placeholder="Year")
    n-divider(vertical)
    .text-xl Customer:
    n-select(v-model:value="customerRecords.selectedCustomerName" :options="customersOption" size="large" filterable clearable)
    n-button(v-if="customerAccount" @click="showUpdateCustomerForm()" type="info") Update Customer
    n-popconfirm(v-if="customerAccount" @positive-click="deleteCustomer()")
      span Are you sure to delete this customer?
      template(#trigger)
        n-button(type="error") Delete Customer
    n-button(type="primary" @click="showAddCustomerForm()") Add Customer
  .overflow-auto.flex-grow.outline.outline-1.outline-grey.pb-100
    n-table(v-if="customerAccount" :bordered="false" style="overflow: visible;" size="small")
      thead.sticky.top-0.z-3
        tr
          th.w-10.min-w-10
          th.w-38.min-w-38
            .flex.gap-x-2 Date
              n-popover(trigger="click")
                template(#trigger)
                  n-badge(:show="!!lpoDateFilter" dot)
                    n-button(text) #[.i-carbon-filter]
                n-date-picker(v-model:value="lpoDateFilter" type="daterange" clearable)
          th.w-50.min-w-50 LPO
          th.w-38.min-w-38
            .flex.gap-x-2 Date
              n-popover(trigger="click")
                template(#trigger)
                  n-badge(:show="!!invoiceDateFilter" dot)
                    n-button(text) #[.i-carbon-filter]
                n-date-picker(v-model:value="invoiceDateFilter" type="daterange" clearable)
          th.w-50.min-w-50 Invoice No.
          th.w-50.min-w-50 Amt #[n-tag(type="success") SUM: {{ format(sumBy(filteredCustomerItems, item => item.invoiceAmount)) }}]
          th.w-38.min-w-38
            .flex.gap-x-2 Date
              n-popover(trigger="click")
                template(#trigger)
                  n-badge(:show="!!chequeDateFilter" dot)
                    n-button(text) #[.i-carbon-filter]
                n-date-picker(v-model:value="chequeDateFilter" type="daterange" clearable)
          th.w-50.min-w-50 Cheque No.
          th.w-50.min-w-50 Amt #[n-tag(type="success") SUM: {{ format(sumBy(filteredCustomerItems, item => item.chequeAmount)) }}]
          th.min-w-30 Remark
          th.w-10
            n-tooltip(:disabled="!invoiceDateFilter && !chequeDateFilter") Disabled when filter is applied.
              template(#trigger)
                n-button(text @click="addItem" :disabled="!!invoiceDateFilter || !!chequeDateFilter")
                  .i-carbon-add-alt(hover="bg-green-7")
      tbody(v-if="customerAccount")
        transition-group(name="table-row")
          tr(
            v-for="item, i in filteredCustomerItems"
            :draggable="i === draggableRow"
            @dragstart="draggingIndex = i"
            @dragover.prevent
            @drop="dropItem(i)"
            :key="item.id"
          )
            td.cursor-move(@mousedown="draggableRow = i") {{ i+1 }}
            td
              n-date-picker(v-model:value="item.lpoDate" type="date" size="small" clearable)
            td
              n-input(v-model:value="item.lpo" size="small")
            td
              n-date-picker(v-model:value="item.invoiceDate" type="date" size="small" clearable)
            td
              n-input(v-model:value="item.invoiceNo" size="small")
            td.text-right
              n-input-number(
                v-model:value="item.invoiceAmount"
                step="0.01"
                :format="format"
                :parse="parse"
                :show-button="false" placeholder=""
                size="small"
              )
            td
              n-date-picker(v-model:value="item.chequeDate" type="date" size="small" clearable)
            td
              n-input(v-model:value="item.chequeNo" size="small")
            td.text-right
              n-input-number(
                v-model:value="item.chequeAmount"
                step="0.01"
                :format="format"
                :parse="parse"
                :show-button="false" placeholder=""
                size="small"
              )
            td.text-right
              n-tooltip(:disabled="!item.remark")
                div {{ item.remark }}
                template(#trigger)
                  n-input(v-model:value="item.remark" size="small")
            td
              .i-carbon-subtract-alt(hover="bg-red-7 cursor-pointer" @click="removeItem(i)")
    .flex.flex-col.items-center.justify-center.h-full(v-else)
      n-empty(size="huge")
        div
          .text-center.text-3xl No Customer Selected
          .text-center.text-3xl Please select a customer to view its records.
          .text-center.text-3xl.flex.items-center You can add a new customer by clicking
            n-button(type="primary" @click="showAddCustomerForm()" style="margin-left: 8px") Add Customer
  n-modal(v-model:show="addCustomerForm.show" preset="dialog" title="Add Customer")
    n-form(:model="addCustomerForm" :rules="addCustomerRule" ref="addCustomerFormRef")
      n-form-item(label="Customer Name" path="customerName")
        n-input(v-model:value="addCustomerForm.customerName" placeholder="Customer Name" @keydown.enter.prevent="addCustomer")
    template(#action)
      n-button(@click="addCustomer" type="primary") OK

  n-modal(v-model:show="updateCustomerForm.show" preset="dialog" title="Update Customer")
    n-form(:model="updateCustomerForm" :rules="updateCustomerRule" ref="updateCustomerFormRef")
      n-form-item(label="Customer Name" path="customerName")
        n-input(v-model:value="updateCustomerForm.customerName" placeholder="Customer Name" @keydown.enter.prevent="updateCustomer")
    template(#action)
      n-button(@click="updateCustomer" type="primary") OK

  n-modal(v-model:show="showStatisticModal" preset="dialog" style="width: calc(100vw - 200px); height: calc(100vh - 200px);")
    template(#header)
      .flex.items-center.gap-x-2.w-full Statistic
        n-radio-group(v-model:value="statisticAmountType")
          n-radio-button(value="invoice") Invoice
          n-radio-button(value="cheque") Cheque
        n-radio-group(v-model:value="statisticPeriodType")
          n-radio-button(value="all") All
          n-radio-button(value="monthly") Monthly
          n-radio-button(value="quarterly") Quarterly
          n-radio-button(value="yearly") Yearly
        .w-50
          n-select(v-show="statisticPeriodType === 'monthly'" v-model:value="statisticMonthlyPeriod" :options="statisticPeriodOptions.monthly" filterable clearable)
          n-select(v-show="statisticPeriodType === 'quarterly'" v-model:value="statisticQuarterlyPeriod" :options="statisticPeriodOptions.quarterly" filterable clearable)
          n-select(v-show="statisticPeriodType === 'yearly'" v-model:value="statisticYearlyPeriod" :options="statisticPeriodOptions.yearly" filterable clearable)
    n-scrollbar.pr-2(style="height: calc(100vh - 280px);")
      n-table(v-if="statistic" style="overflow: visible;" size="small")
        thead.sticky.top-0.z-3
          tr
            th Customer
            th
              span.cursor-pointer {{ statisticAmountType == 'invoice' ? 'Invoice' : 'Cheque'  }} Amount
              n-tag.float-right.font-bold(type="success") SUM: {{ format(statistic.totalAmount) }}
        tbody
          tr(v-for="customerAccount in statistic.customers")
            td {{ customerAccount.customerName }}
            td.text-right.relative.font-bold {{ format(customerAccount.totalAmount) }}
              .absolute.left-0.bg-gray.h-full.top-0.opacity-30(:style="`width: ${customerAccount.totalAmount / statistic.totalAmount * 100}%`")
      .flex.items-center.justify-center.w-full(v-else size="huge" style="height: calc(100vh - 280px);")
        n-empty
          .text-4xl Please select a period to view statistic.
          n-select(v-show="statisticPeriodType === 'monthly'" v-model:value="statisticMonthlyPeriod" :options="statisticPeriodOptions.monthly" filterable clearable size="large")
          n-select(v-show="statisticPeriodType === 'quarterly'" v-model:value="statisticQuarterlyPeriod" :options="statisticPeriodOptions.quarterly" filterable clearable size="large")
          n-select(v-show="statisticPeriodType === 'yearly'" v-model:value="statisticYearlyPeriod" :options="statisticPeriodOptions.yearly" filterable clearable size="large")

  n-modal(v-model:show="showPendingInvoicesModal" preset="dialog" title="Pending Invoices" style="width: calc(100vw - 200px); height: calc(100vh - 200px);")
    n-scrollbar.pr-2(style="height: calc(100vh - 280px);")
      template(v-for="customerAccount in pendingInvoices.customers")
        n-table(style="overflow: visible;" size="small" :single-line="false")
          thead.sticky.top-0.z-3
            tr
              th(colspan="4")
                .text-xl.font-bold.text-center {{ customerAccount.customerName }}
            tr
              th.w-35 Date
              th.w-50 Invoice No
              th.w-60 Amount
                n-tag.font-mono.float-right(type="error") SUM: {{ format(sumBy(customerAccount.items, item => item.invoiceAmount)) }}
              th Remark
          tbody
            tr(v-for="item in customerAccount.items")
              td.font-mono {{ item.invoiceDate && formatDate(new Date(item.invoiceDate), 'yyyy-MM-dd') }}
              td.font-mono {{ item.invoiceNo }}
              td.font-mono.text-right {{ format(item.invoiceAmount) }}
              td {{ item.remark }}

</template>

<style lang="scss" scoped>
@import "~/styles/common.scss";

.font-mono {
  font-family: Consolas, 'Courier New', Courier, monospace;
}

.table-row-move,
/* apply transition to moving elements */
.table-row-enter-active,
.table-row-leave-active {
  transition: all 0.5s ease;
}

.table-row-enter-from,
.table-row-leave-to {
  opacity: 0;
}
</style>
