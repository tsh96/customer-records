import { RouterLink } from "vue-router";

export const menuOptions = [
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/customer-records'
          }
        },
        { default: () => 'Customer Records' }
      ),
    key: 'customer-records',
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/government'
          }
        },
        { default: () => 'Customer Records (Gov)' }
      ),
    key: 'government',
  }
]
