const dateFmt = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

export const formatDate = (iso) => dateFmt.format(new Date(iso))
export const formatDateTime = (iso) => dateTimeFmt.format(new Date(iso))
