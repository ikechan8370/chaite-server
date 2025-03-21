export function formatBeijingDate(date = new Date()): string {
  const offset = 8 * 60; // 时区UTC+8
  const adjustedDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + (date.getTimezoneOffset()/60 + offset)/24 // 调整时区
    )
  );
  return `${adjustedDate.getFullYear()}年${adjustedDate.getMonth()+1}月${adjustedDate.getDate()}日`;
}