import { defineStore } from 'pinia'

export type LabelObj = { text: string }

export type RecordType = 'LDAP' | 'Локальная'

export interface RecordRow {
  id: string
  labels: LabelObj[]
  type: RecordType
  login: string
  password: string | null
}

const STORAGE_KEY = 'records_v1'

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useRecordsStore = defineStore('records', {
  state: () => ({
    rows: [] as RecordRow[]
  }),
  actions: {
    load() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as RecordRow[]
        this.rows = parsed.map(r => ({
          id: r.id ?? genId(),
          labels: Array.isArray(r.labels)
            ? r.labels.map(l => ({ text: String(l.text ?? '') }))
            : [],
          type: (r.type === 'LDAP' ? 'LDAP' : 'Локальная') as RecordType,
          login: String(r.login ?? ''),
          password: r.password === null ? null : String(r.password ?? '')
        }))
      } catch {
        this.rows = []
      }
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rows))
    },
    addRow(): string {
      const id = genId()
      this.rows.push({
        id,
        labels: [],
        type: 'Локальная',
        login: '',
        password: ''
      })
      this.save()
      return id
    },
    deleteRow(id: string) {
      const idx = this.rows.findIndex(r => r.id === id)
      if (idx >= 0) {
        this.rows.splice(idx, 1)
        this.save()
      }
    },
    updateFromEditor(
      id: string,
      editor: {
        labelRaw: string
        type: RecordType
        login: string
        password: string | null
      }
    ) {
      const r = this.rows.find(x => x.id === id)
      if (!r) return
      const labels = editor.labelRaw
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => ({ text: s } as LabelObj))
      r.labels = labels
      r.type = editor.type
      r.login = editor.login
      r.password = editor.type === 'LDAP' ? null : editor.password ?? ''
      this.save()
    },
    setTypeAndNormalize(id: string, type: RecordType) {
      const r = this.rows.find(x => x.id === id)
      if (!r) return
      r.type = type
      if (type === 'LDAP') r.password = null
      this.save()
    }
  }
})
