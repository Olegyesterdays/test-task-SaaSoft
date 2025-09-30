<template>
  <div class="app">
    <header class="header">
      <h1>Учётные записи</h1>
      <button class="btn-add" type="button" @click="onAdd">+</button>
    </header>

    <div class="info">
      <div>!</div>
      <div>
        Для указания нескольких меток для одной пары логин/пароль используйте
        <strong>;</strong>
      </div>
    </div>

    <table class="records-table">
      <thead>
        <tr>
          <th>Метка</th>
          <th>Тип записи</th>
          <th>Логин</th>
          <th>Пароль</th>
          <th>Действия</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in store.rows" :key="row.id">
          <td>
            <input
              v-model="editing[row.id]!.labelRaw"
              :maxlength="50"
              :class="{ invalid: hasError(row.id, 'label') }"
              placeholder="метка;метка2"
              @blur="onBlur(row.id)"
            />
          </td>

          <td>
            <select
              v-model="editing[row.id]!.type"
              @change="onTypeChange(row.id)"
            >
              <option value="Локальная">Локальная</option>
              <option value="LDAP">LDAP</option>
            </select>
          </td>

          <template v-if="editing[row.id]!.type === 'LDAP'">
            <td colspan="2">
              <input
                v-model="editing[row.id]!.login"
                :maxlength="100"
                :class="{ invalid: hasError(row.id, 'login') }"
                placeholder="логин (используется вместо пароля)"
                @blur="onBlur(row.id)"
              />
            </td>
          </template>

          <template v-else>
            <td>
              <input
                v-model="editing[row.id]!.login"
                :maxlength="100"
                :class="{ invalid: hasError(row.id, 'login') }"
                placeholder="логин"
                @blur="onBlur(row.id)"
              />
            </td>

            <td>
              <div class="input-wrap">
                <input
                  v-model="editing[row.id]!.password"
                  :maxlength="100"
                  :type="showPassword[row.id] ? 'text' : 'password'"
                  :class="{ invalid: hasError(row.id, 'password') }"
                  placeholder="пароль"
                  @blur="onBlur(row.id)"
                />

                <button
                  type="button"
                  class="eye-btn"
                  :aria-label="
                    showPassword[row.id] ? 'Скрыть пароль' : 'Показать пароль'
                  "
                  @click="toggleShowPassword(row.id)"
                >
                  <svg
                    v-if="!showPassword[row.id]"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>

                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a17.3 17.3 0 0 1 5-5.11"
                    />
                    <path d="M1 1l22 22" />
                    <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" />
                    <path d="M14.12 9.88A3 3 0 0 0 9.88 14.12" />
                  </svg>
                </button>
              </div>
            </td>
          </template>

          <td>
            <button class="btn-delete" type="button" @click="onDelete(row.id)">
              Удалить
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRecordsStore } from './store/accounts'

type EditorRow = {
  labelRaw: string
  type: 'LDAP' | 'Локальная'
  login: string
  password: string
}

const store = useRecordsStore()
const editing = reactive<Record<string, EditorRow>>({})
const errors = reactive<
  Record<string, { label?: boolean; login?: boolean; password?: boolean }>
>({})
const showPassword = reactive<Record<string, boolean>>({})

function buildEditorFromRow(row: any): EditorRow {
  return {
    labelRaw: Array.isArray(row.labels)
      ? row.labels.map((l: any) => l.text).join(';')
      : '',
    type: row.type === 'LDAP' ? 'LDAP' : 'Локальная',
    login: row.login ?? '',
    password: row.password === null ? '' : row.password ?? ''
  }
}

onMounted(() => {
  store.load()
  for (const r of store.rows) {
    editing[r.id] = buildEditorFromRow(r)
    errors[r.id] = {}
    showPassword[r.id] = false
  }
})

function onAdd() {
  const id = store.addRow()
  const row = store.rows.find(x => x.id === id)!

  editing[id] = buildEditorFromRow(row)
  errors[id] = {}
  showPassword[id] = false
}

function onDelete(id: string) {
  store.deleteRow(id)
  delete editing[id]
  delete errors[id]
  delete showPassword[id]
}

function validateEditor(id: string) {
  const e = editing[id]
  if (!e) return false

  const err: { label?: boolean; login?: boolean; password?: boolean } = {}

  if (e.labelRaw && e.labelRaw.length > 50) err.label = true

  if (!e.login?.trim() || e.login.length > 100) err.login = true

  if (e.type === 'Локальная') {
    if (!e.password?.trim() || e.password.length > 100) err.password = true
  } else {
    if (errors[id]) delete errors[id].password
  }

  errors[id] = err
  return Object.keys(err).length === 0
}

function onBlur(id: string) {
  if (!editing[id]) return
  if (validateEditor(id)) {
    store.updateFromEditor(id, {
      labelRaw: editing[id].labelRaw,
      type: editing[id].type,
      login: editing[id].login,
      password: editing[id].type === 'LDAP' ? null : editing[id].password
    })
  }
}

function onTypeChange(id: string) {
  const e = editing[id]
  if (!e) return

  if (e.type === 'LDAP') {
    e.password = ''
    showPassword[id] = false
  }

  if (validateEditor(id)) {
    store.updateFromEditor(id, {
      labelRaw: e.labelRaw,
      type: e.type,
      login: e.login,
      password: e.type === 'LDAP' ? null : e.password
    })
  }
}

function toggleShowPassword(id: string) {
  showPassword[id] = !showPassword[id]
}

function hasError(id: string, field: 'label' | 'login' | 'password') {
  return !!errors[id]?.[field]
}
</script>

<style scoped lang="scss">
.app {
  width: 50vw;
  margin: auto;
}

.header {
  display: flex;

  h1 {
    margin-right: 20px;
  }

  button {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}

.info {
  display: flex;
  margin: 12px 0;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;

  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
    vertical-align: middle;
    position: relative;
  }

  input,
  select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 36px 6px 8px;
    font-size: 14px;
  }
}

.input-wrap {
  position: relative;
  display: block;

  input {
    padding-right: 36px;
  }
}

.eye-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;

  svg {
    pointer-events: none;
    width: 18px;
    height: 18px;
    color: #555;
  }
}

.invalid {
  outline: none;
  border: 1.5px solid #d9534f !important;
  box-shadow: 0 0 0 2px rgba(217, 83, 79, 0.08);
}

.btn-add {
  padding: 6px 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-delete {
  padding: 4px 8px;
  cursor: pointer;
}
</style>
