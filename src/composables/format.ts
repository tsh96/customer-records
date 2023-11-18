// return the number to money format which is separated by comma with 2 decimal places
export function format(v?: number | null) {
  if (!v) return ''
  return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// convert money format to number
export function parse(v: string) {
  if (!v) return 0
  return parseFloat(v.replace(/,/g, ''))
}
