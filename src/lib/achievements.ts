export const ACHIEVEMENTS = [
  {
    key: "login-7-days",
    name: "Bền bỉ 7 ngày",
    description: "Đăng nhập liên tiếp trong 7 ngày.",
  },
  {
    key: "login-30-days",
    name: "Kỷ luật 30 ngày",
    description: "Đăng nhập liên tiếp trong 30 ngày.",
  },
  {
    key: "correct-10",
    name: "Khởi đầu vững chắc",
    description: "Trả lời đúng liên tiếp 10 câu trong các buổi học.",
  },
  {
    key: "correct-100",
    name: "Bách chiến bách thắng",
    description: "Trả lời đúng liên tiếp 100 câu trong các buổi học.",
  },
  {
    key: "topic-phan-cung",
    name: "Chuyên gia phần cứng",
    description: "Đạt ít nhất 90% câu đúng phần cứng trong một đề thi thử.",
  },
  {
    key: "topic-he-dieu-hanh",
    name: "Chuyên gia hệ điều hành",
    description: "Đạt ít nhất 90% câu đúng hệ điều hành trong một đề thi thử.",
  },
  {
    key: "topic-mang-internet",
    name: "Chuyên gia mạng",
    description: "Đạt ít nhất 90% câu đúng mạng và Internet trong một đề thi thử.",
  },
  {
    key: "topic-word-soan-thao",
    name: "Chuyên gia Word",
    description: "Đạt ít nhất 90% câu đúng Word trong một đề thi thử.",
  },
  {
    key: "topic-excel-bang-tinh",
    name: "Chuyên gia Excel",
    description: "Đạt ít nhất 90% câu đúng Excel trong một đề thi thử.",
  },
  {
    key: "topic-co-so-du-lieu",
    name: "Chuyên gia cơ sở dữ liệu",
    description: "Đạt ít nhất 90% câu đúng cơ sở dữ liệu trong một đề thi thử.",
  },
] as const;

export type AchievementKey = (typeof ACHIEVEMENTS)[number]["key"];

export function getAchievement(key: string | null | undefined) {
  return ACHIEVEMENTS.find((achievement) => achievement.key === key) ?? null;
}
