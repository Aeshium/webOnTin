export const PASSWORD_POLICY_MESSAGE =
  "Mật khẩu cần có 5–20 ký tự, ít nhất một chữ hoa, một chữ số và một ký tự đặc biệt.";

export function validatePassword(password: string) {
  if (
    password.length < 5 ||
    password.length > 20 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password)
  ) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}
