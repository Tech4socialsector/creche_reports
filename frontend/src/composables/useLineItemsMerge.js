// Merges several budgets' line-item responses (each shaped like
// get_budget_line_items / get_utilisation_line_items's return value) into
// one consolidated table: the union of every month column (chronological,
// de-duped) and rows summed by matching type_of_expenses + budget_sub_head +
// budget_main_head across budgets.
export function mergeLineItems(responses) {
  const monthSet = new Set()
  const monthOrder = []
  for (const r of responses) {
    for (const m of r.months || []) {
      if (!monthSet.has(m)) {
        monthSet.add(m)
        monthOrder.push(m)
      }
    }
  }
  monthOrder.sort((a, b) => monthSortKey(a) - monthSortKey(b))

  const byKey = new Map()
  for (const r of responses) {
    for (const row of r.rows || []) {
      const key = `${row.type_of_expenses || ''}|${row.budget_sub_head || ''}|${row.budget_main_head || ''}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          type_of_expenses_id: row.type_of_expenses_id,
          type_of_expenses: row.type_of_expenses,
          budget_main_head: row.budget_main_head,
          budget_sub_head: row.budget_sub_head,
          monthly: {},
          total: 0,
          notes: row.notes || '',
        })
      }
      const merged = byKey.get(key)
      for (const [month, amount] of Object.entries(row.monthly || {})) {
        merged.monthly[month] = (merged.monthly[month] || 0) + (amount || 0)
      }
      merged.total += row.total || 0
    }
  }

  return { months: monthOrder, rows: [...byKey.values()] }
}

function monthSortKey(label) {
  const [mon, year] = label.split(' ')
  const MONTHS_CAL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return parseInt(year || '0', 10) * 12 + MONTHS_CAL.indexOf(mon)
}
