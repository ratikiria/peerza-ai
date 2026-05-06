export const SECURITY_QUESTIONS: { id: string; label: string }[] = [
  { id: "first_pet",         label: "What was the name of your first pet?" },
  { id: "birth_city",        label: "What city were you born in?" },
  { id: "mothers_maiden",    label: "What is your mother's maiden name?" },
  { id: "first_school",      label: "What was the name of your first school?" },
  { id: "first_car",         label: "What was your first car?" },
  { id: "favorite_book",     label: "What is your favorite book?" },
  { id: "childhood_nick",    label: "What was your childhood nickname?" },
  { id: "street_grew_up",    label: "What street did you grow up on?" },
  { id: "best_friend",       label: "What was the name of your best childhood friend?" },
  { id: "favorite_teacher",  label: "What was your favorite teacher's name?" },
]

export function isValidSecurityQuestion(id: string): boolean {
  return SECURITY_QUESTIONS.some((q) => q.id === id)
}

export function questionLabel(id: string): string | null {
  return SECURITY_QUESTIONS.find((q) => q.id === id)?.label ?? null
}
