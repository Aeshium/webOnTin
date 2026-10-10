// ============================================================================
// SEED = nạp dữ liệu mẫu vào database.
// Chạy bằng lệnh:  npx tsx src/db/seed.ts
// Tương đương việc bạn mở MySQL và chạy một loạt lệnh INSERT INTO ...
// ============================================================================
import "dotenv/config";
import { db } from "./index";
import { eq } from "drizzle-orm";
import { topics, questions, attemptAnswers, attempts } from "./schema";
import { getAdvancedQuestions, getExpandedQuestions } from "./question-expansion";
import { getAdditionalQuestions } from "./question-additions";

const TOPIC_DATA: Array<{
  id: string;
  name: string;
  tagline: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  questions: Array<{
    content: string;
    options: [string, string, string, string];
    correctIndex: number;
    explanation: string;
  }>;
}> = [
  {
    id: "phan-cung",
    name: "Phần cứng máy tính",
    tagline: "CPU, RAM, ổ cứng — mổ xẻ sức khỏe máy tính",
    icon: "Cpu",
    colorFrom: "#22d3ee",
    colorTo: "#0284c7",
    questions: [
      {
        content: "CPU là viết tắt của cụm từ nào sau đây?",
        options: [
          "Central Processing Unit",
          "Computer Personal Unit",
          "Central Program Utility",
          "Computer Processing Unit",
        ],
        correctIndex: 0,
        explanation:
          "CPU = Central Processing Unit (bộ xử lý trung tâm), được coi là \"bộ não\" của máy tính, nơi thực hiện mọi phép tính và lệnh điều khiển.",
      },
      {
        content: "Thiết bị nào sau đây là thiết bị NHẬP dữ liệu?",
        options: ["Máy in", "Màn hình", "Máy quét (Scanner)", "Loa máy tính"],
        correctIndex: 2,
        explanation:
          "Thiết bị nhập đưa dữ liệu VÀO máy tính: bàn phím, chuột, máy quét, micro... Máy in, màn hình và loa là thiết bị XUẤT (đưa dữ liệu ra ngoài).",
      },
      {
        content: "Đơn vị nhỏ nhất dùng để đo dữ liệu trong máy tính là gì?",
        options: ["Byte", "Bit", "Kilobyte", "Megabyte"],
        correctIndex: 1,
        explanation:
          "Bit (Binary Digit) là đơn vị nhỏ nhất, chỉ nhận 1 trong 2 giá trị: 0 hoặc 1. Cứ 8 bit ghép lại thành 1 byte.",
      },
      {
        content: "1 KB (Kilobyte) bằng bao nhiêu byte?",
        options: ["1000 byte", "512 byte", "1024 byte", "2048 byte"],
        correctIndex: 2,
        explanation:
          "Máy tính hoạt động theo hệ nhị phân nên 1 KB = 2^10 = 1024 byte. Tương tự 1 MB = 1024 KB, 1 GB = 1024 MB.",
      },
      {
        content: "Bộ nhớ nào sau đây sẽ MẤT toàn bộ dữ liệu khi tắt nguồn máy tính?",
        options: ["ROM", "RAM", "Ổ cứng HDD", "USB"],
        correctIndex: 1,
        explanation:
          "RAM (Random Access Memory) là bộ nhớ tạm thởi — chỉ lưu dữ liệu khi có điện. Đó là lý do phải lưu (save) bài trước khi tắt máy!",
      },
      {
        content: "Thiết bị nào được gọi là \"bo mạch chủ\" của máy tính?",
        options: ["Mainboard", "CPU", "Card màn hình (VGA)", "Nguồn (PSU)"],
        correctIndex: 0,
        explanation:
          "Mainboard (Motherboard) là bảng mạch chính, nơi cắm và kết nối tất cả linh kiện khác: CPU, RAM, ổ cứng, card màn hình...",
      },
      {
        content: "GPU trong máy tính chủ yếu dùng để làm gì?",
        options: [
          "Lưu trữ dữ liệu lâu dài",
          "Xử lý hình ảnh và đồ họa",
          "Kết nối mạng Internet",
          "Cấp nguồn điện cho máy",
        ],
        correctIndex: 1,
        explanation:
          "GPU (Graphics Processing Unit) là bộ xử lý đồ họa, chuyên xử lý hình ảnh, video, game và các tác vụ tính toán song song như AI.",
      },
      {
        content: "So với ổ cứng HDD, ổ SSD có ưu điểm nổi bật nào?",
        options: [
          "Luôn rẻ hơn nhiều",
          "Tốc độ đọc/ghi nhanh hơn hẳn",
          "Dung lượng luôn lớn hơn",
          "Không cần nguồn điện",
        ],
        correctIndex: 1,
        explanation:
          "SSD dùng chip nhớ flash (không có đĩa quay cơ học như HDD) nên đọc/ghi nhanh hơn nhiều lần, khởi động máy chỉ mất vài giây.",
      },
    ],
  },
  {
    id: "he-dieu-hanh",
    name: "Hệ điều hành",
    tagline: "Windows, phím tắt và quản lý tệp tin",
    icon: "AppWindow",
    colorFrom: "#a78bfa",
    colorTo: "#7c3aed",
    questions: [
      {
        content: "Phần mềm nào sau đây là một HỆ ĐIỀU HÀNH?",
        options: [
          "Microsoft Word",
          "Windows 11",
          "Google Chrome",
          "Adobe Photoshop",
        ],
        correctIndex: 1,
        explanation:
          "Windows 11 là hệ điều hành — phần mềm nền quản lý toàn bộ máy tính. Word, Chrome, Photoshop chỉ là phần mềm ứng dụng chạy TRÊN hệ điều hành.",
      },
      {
        content: "Hệ điều hành nào sau đây là phần mềm MÃ NGUỒN MỞ?",
        options: ["Windows 11", "macOS", "Linux", "iOS"],
        correctIndex: 2,
        explanation:
          "Linux là hệ điều hành mã nguồn mở: ai cũng có thể xem, sửa và chia sẻ mã nguồn của nó miễn phí. Windows, macOS, iOS đều là mã nguồn đóng.",
      },
      {
        content: "Trong Windows, tổ hợp phím nào dùng để SAO CHÉP (Copy)?",
        options: ["Ctrl + V", "Ctrl + X", "Ctrl + C", "Ctrl + Z"],
        correctIndex: 2,
        explanation:
          "Ctrl + C = Copy (sao chép), Ctrl + X = Cut (cắt), Ctrl + V = Paste (dán), Ctrl + Z = Undo (hoàn tác). Bộ tứ này dùng được ở hầu hết mọi phần mềm.",
      },
      {
        content: "Tổ hợp phím nào dùng để CHUYỂN ĐỔI giữa các cửa sổ đang mở?",
        options: ["Alt + Tab", "Ctrl + Alt + Del", "Alt + F4", "Windows + E"],
        correctIndex: 0,
        explanation:
          "Giữ Alt và bấm Tab để lướt qua các cửa sổ đang mở. Alt + F4 đóng cửa sổ hiện tại, Windows + E mở File Explorer.",
      },
      {
        content: "Tệp THỰC THI (chạy được) trên Windows thường có phần mở rộng nào?",
        options: [".txt", ".exe", ".docx", ".jpg"],
        correctIndex: 1,
        explanation:
          ".exe (executable) là tệp chương trình chạy được trên Windows. .txt là văn bản thuần, .docx là tài liệu Word, .jpg là ảnh.",
      },
      {
        content: "Khi xóa một tệp bằng phím Delete trong Windows, tệp đó thường được chuyển đi đâu?",
        options: [
          "Mất vĩnh viễn ngay lập tức",
          "Thùng rác (Recycle Bin)",
          "Thư mục Downloads",
          "Màn hình Desktop",
        ],
        correctIndex: 1,
        explanation:
          "Tệp bị xóa thường nằm trong Recycle Bin và có thể khôi phục lại. Chỉ khi dùng Shift + Delete hoặc dọn thùng rác thì tệp mới mất vĩnh viễn.",
      },
      {
        content: "Để mở nhanh Task Manager (Quản lý tác vụ) trong Windows, dùng tổ hợp phím nào?",
        options: [
          "Ctrl + Shift + Esc",
          "Ctrl + Esc",
          "Alt + Enter",
          "Shift + Delete",
        ],
        correctIndex: 0,
        explanation:
          "Ctrl + Shift + Esc mở thẳng Task Manager để xem tiến trình, ép tắt ứng dụng bị treo và theo dõi hiệu năng CPU/RAM.",
      },
      {
        content: "Đâu KHÔNG phải là chức năng của hệ điều hành?",
        options: [
          "Quản lý tệp tin và thư mục",
          "Quản lý phần cứng và bộ nhớ",
          "Soạn thảo văn bản",
          "Cung cấp giao diện ngườat dùng",
        ],
        correctIndex: 2,
        explanation:
          "Soạn thảo văn bản là việc của phần mềm ứng dụng (Word, Notepad...). Hệ điều hành lo việc \"hậu trường\": quản lý tệp, phần cứng, bộ nhớ và giao diện.",
      },
    ],
  },
  {
    id: "mang-internet",
    name: "Mạng & Internet",
    tagline: "IP, DNS, Wi-Fi — thông thuộc thế giới kết nối",
    icon: "Globe",
    colorFrom: "#f472b6",
    colorTo: "#db2777",
    questions: [
      {
        content: "WWW là viết tắt của cụm từ nào?",
        options: [
          "World Wide Web",
          "World Web Wide",
          "Wide World Web",
          "Web World Wide",
        ],
        correctIndex: 0,
        explanation:
          "WWW = World Wide Web (mạng lưới web toàn cầu), do Tim Berners-Lee phát minh năm 1989. Web chỉ là MỘT dịch vụ chạy trên nền Internet.",
      },
      {
        content: "Giao thức nào AN TOÀN HƠN khi duyệt web và nhập thông tin cá nhân?",
        options: ["HTTP", "HTTPS", "FTP", "SMTP"],
        correctIndex: 1,
        explanation:
          "HTTPS (S = Secure) mã hóa dữ liệu giữa trình duyệt và máy chủ, nên nhập mật khẩu hay thẻ ngân hàng sẽ an toàn hơn hẳn HTTP thường.",
      },
      {
        content: "Hệ thống DNS có vai trò gì trên Internet?",
        options: [
          "Phân giải tên miền thành địa chỉ IP",
          "Tăng tốc độ truy cập mạng",
          "Chặn virus và mã độc",
          "Thiết kế giao diện website",
        ],
        correctIndex: 0,
        explanation:
          "DNS giống như \"danh bạ điện thoại\" của Internet: bạn gõ google.com, DNS dịch thành địa chỉ IP (ví dụ 142.250.x.x) để máy tìm đúng máy chủ.",
      },
      {
        content: "Địa chỉ nào sau đây là một địa chỉ IP (IPv4) HỢP LỆ?",
        options: [
          "192.168.1.1",
          "256.300.1.1",
          "abc.168.1.1",
          "192.168.1",
        ],
        correctIndex: 0,
        explanation:
          "IPv4 gồm 4 nhóm số cách nhau bởi dấu chấm, mỗi nhóm từ 0 đến 255. 192.168.1.1 hợp lệ; 256 và 300 đều vượt quá 255.",
      },
      {
        content: "LAN là viết tắt của cụm từ nào?",
        options: [
          "Local Area Network",
          "Large Area Network",
          "Local Access Network",
          "Long Area Network",
        ],
        correctIndex: 0,
        explanation:
          "LAN = Local Area Network — mạng cục bộ trong phạm vi nhỏ như gia đình, phòng học, công ty. Mạng diện rộng (thành phố, quốc gia) gọi là WAN.",
      },
      {
        content: "Trong địa chỉ email \"bien@gmail.com\", ký tự @ dùng để làm gì?",
        options: [
          "Chỉ để trang trí",
          "Ngăn cách tên ngườat dùng và tên miền máy chủ thư",
          "Mã hóa nội dung email",
          "Không có ý nghĩa gì",
        ],
        correctIndex: 1,
        explanation:
          "\"bien\" là tên hộp thư, \"gmail.com\" là máy chủ thư. Dấu @ (đọc là \"a còng\") ngăn cách hai phần này để hệ thống biết gửi thư đến đâu.",
      },
      {
        content: "Thiết bị nào thường dùng để PHÁT sóng Wi-Fi trong gia đình?",
        options: [
          "Modem/Router Wi-Fi",
          "Máy in",
          "Máy quét (Scanner)",
          "Ổ cứng gắn ngoài",
        ],
        correctIndex: 0,
        explanation:
          "Modem đưa Internet từ nhà mạng vào nhà, Router Wi-Fi phát sóng không dây cho điện thoại, laptop... (nhiều thiết bị hiện nay gộp cả hai trong một).",
      },
      {
        content: "Phần mềm nào sau đây KHÔNG phải là trình duyệt web?",
        options: [
          "Google Chrome",
          "Mozilla Firefox",
          "Microsoft Excel",
          "Safari",
        ],
        correctIndex: 2,
        explanation:
          "Excel là phần mềm bảng tính. Chrome, Firefox, Safari là trình duyệt web — phần mềm dùng để truy cập các website.",
      },
    ],
  },
  {
    id: "word-soan-thao",
    name: "Word & Soạn thảo",
    tagline: "Soạn thảo, định dạng, trộn thư như dân văn phòng",
    icon: "FileText",
    colorFrom: "#60a5fa",
    colorTo: "#2563eb",
    questions: [
      {
        content: "Trong MS Word, tổ hợp phím Ctrl + B dùng để làm gì?",
        options: [
          "In nghiêng chữ",
          "IN ĐẬM chữ",
          "Gạch chân chữ",
          "Căn giữa đoạn",
        ],
        correctIndex: 1,
        explanation:
          "B = Bold (đậm). Ngoài ra Ctrl + I = Italic (nghiêng), Ctrl + U = Underline (gạch chân). Ba phím này hay đi thi cùng nhau lắm!",
      },
      {
        content: "Để LƯU (Save) văn bản đang soạn trong Word, ta dùng tổ hợp phím nào?",
        options: ["Ctrl + S", "Ctrl + P", "Ctrl + O", "Ctrl + N"],
        correctIndex: 0,
        explanation:
          "Ctrl + S = Save. Ghi nhớ thêm: Ctrl + P = Print (in), Ctrl + O = Open (mở), Ctrl + N = New (văn bản mới).",
      },
      {
        content: "Tổ hợp phím Ctrl + Z trong Word có chức năng gì?",
        options: [
          "Làm lại thao tác (Redo)",
          "Hoàn tác thao tác (Undo)",
          "Đóng văn bản",
          "Xóa toàn bộ đoạn văn",
        ],
        correctIndex: 1,
        explanation:
          "Ctrl + Z = Undo — quay lại thao tác trước đó, \"phao cứu sinh\" khi lỡ tay xóa nhầm. Ctrl + Y thì làm ngược lại (Redo).",
      },
      {
        content: "Để CĂN ĐỀU HAI BÊN cho đoạn văn bản trong Word, dùng phím tắt nào?",
        options: ["Ctrl + J", "Ctrl + L", "Ctrl + R", "Ctrl + E"],
        correctIndex: 0,
        explanation:
          "Ctrl + J = Justify (căn đều hai bên). Ctrl + L = căn trái, Ctrl + R = căn phải, Ctrl + E = căn giữa (E = cEnter).",
      },
      {
        content: "Tệp văn bản được tạo bởi MS Word (từ bản 2007 trở lên) thường có phần mở rộng nào?",
        options: [".xlsx", ".docx", ".pptx", ".pdf"],
        correctIndex: 1,
        explanation:
          ".docx = tài liệu Word, .xlsx = bảng tính Excel, .pptx = bài trình chiếu PowerPoint. Bộ ba đuôi tệp này rất hay gặp trong đề thi.",
      },
      {
        content: "Chức năng Mail Merge (Trộn thư) trong Word dùng để làm gì?",
        options: [
          "Kiểm tra chính tả tự động",
          "Tạo nhiều thư mờ/giấy báo từ một mẫu và một danh sách",
          "Chèn hình ảnh vào văn bản",
          "Tạo mục lục tự động",
        ],
        correctIndex: 1,
        explanation:
          "Mail Merge kết hợp 1 văn bản mẫu với 1 danh sách (thường từ Excel) để tạo hàng loạt thư mờ, giấy báo... mỗi ngườat một tên riêng — cực tiết kiệm thờat gian.",
      },
      {
        content: "Phần Header của một trang văn bản nằm ở vị trí nào?",
        options: [
          "Vùng lề TRÊN của trang",
          "Vùng lề dưới của trang",
          "Chính giữa trang",
          "Vùng lề trái của trang",
        ],
        correctIndex: 0,
        explanation:
          "Header là vùng lề trên (thường chứa tiêu đề, logo), Footer là vùng lề dưới (thường chứa số trang). Cả hai tự động lặp lại trên mọi trang.",
      },
      {
        content: "Muốn chèn SỐ TRANG vào văn bản Word, ta vào thẻ nào?",
        options: ["Insert", "Home", "File", "View"],
        correctIndex: 0,
        explanation:
          "Vào thẻ Insert → Page Number. Thẻ Insert chứa mọi thứ để \"chèn vào\": bảng, hình ảnh, số trang, header/footer, ký tự đặc biệt...",
      },
    ],
  },
  {
    id: "excel-bang-tinh",
    name: "Excel & Bảng tính",
    tagline: "Công thức, hàm SUM, AVERAGE và địa chỉ ô",
    icon: "Sheet",
    colorFrom: "#4ade80",
    colorTo: "#16a34a",
    questions: [
      {
        content: "Một công thức trong Excel luôn BẮT ĐẦU bằng ký tự nào?",
        options: ["Dấu +", "Dấu =", "Dấu @", "Dấu #"],
        correctIndex: 1,
        explanation:
          "Mọi công thức Excel đều bắt đầu bằng dấu = (bằng). Ví dụ: =A1+B1 hoặc =SUM(A1:A10). Không có dấu = thì Excel hiểu đó là chữ/số thường.",
      },
      {
        content: "Hàm SUM trong Excel dùng để làm gì?",
        options: [
          "Tính trung bình cộng",
          "Tính tổng các giá trị",
          "Đếm số ô có dữ liệu",
          "Tìm giá trị lớn nhất",
        ],
        correctIndex: 1,
        explanation:
          "SUM là hàm tính tổng. Bộ tứ kinh điển: SUM (tổng), AVERAGE (trung bình), MAX (lớn nhất), MIN (nhỏ nhất).",
      },
      {
        content: "Trong Excel, ô A1 là giao của:",
        options: [
          "Cột A và hàng 1",
          "Hàng A và cột 1",
          "Sheet A và ô số 1",
          "Ô này không tồn tại",
        ],
        correctIndex: 0,
        explanation:
          "Địa chỉ ô đọc theo quy tắc: CHỮ là cột, SỐ là hàng. A1 = cột A, hàng 1 — ô đầu tiên trên cùng bên trái của bảng tính.",
      },
      {
        content: "Địa chỉ $A$1 trong Excel được gọi là gì?",
        options: [
          "Địa chỉ tương đối",
          "Địa chỉ tuyệt đối",
          "Địa chỉ hỗn hợp",
          "Địa chỉ vòng",
        ],
        correctIndex: 1,
        explanation:
          "Có dấu $ trước cả cột và hàng ($A$1) = địa chỉ TUYỆT ĐỐI: khi sao chép công thức sang ô khác, địa chỉ này không bị thay đổi.",
      },
      {
        content: "Công thức =AVERAGE(A1:A5) sẽ trả về kết quả nào?",
        options: [
          "Tổng các ô từ A1 đến A5",
          "Giá trị trung bình của các ô từ A1 đến A5",
          "Giá trị lớn nhất trong các ô từ A1 đến A5",
          "Số ô có dữ liệu từ A1 đến A5",
        ],
        correctIndex: 1,
        explanation:
          "AVERAGE = trung bình cộng: cộng tất cả rồi chia cho số ô. A1:A5 đọc là \"vùng từ ô A1 đến ô A5\" (dấu hai chấm = khoảng).",
      },
      {
        content: "Tệp bảng tính Excel (từ bản 2007 trở lên) thường có phần mở rộng nào?",
        options: [".docx", ".pptx", ".xlsx", ".accdb"],
        correctIndex: 2,
        explanation:
          ".xlsx = Excel, .docx = Word, .pptx = PowerPoint, .accdb = cơ sở dữ liệu Access. Nhìn đuôi tệp là biết mở bằng phần mềm nào.",
      },
      {
        content: "Để SẮP XẾP dữ liệu một cột tăng dần (A→Z) trong Excel, ta dùng lệnh nào?",
        options: ["Sort A to Z", "Filter", "Find", "Replace"],
        correctIndex: 0,
        explanation:
          "Sort A to Z sắp xếp tăng dần, Sort Z to A giảm dần. Filter thì chỉ LỌC hiển thị các dòng thỏa điều kiện, không xếp lại thứ tự.",
      },
      {
        content: "Kết quả của công thức =MAX(2, 9, 5) là bao nhiêu?",
        options: ["2", "5", "9", "16"],
        correctIndex: 2,
        explanation:
          "MAX trả về giá trị LỚN NHẤT trong danh sách — ở đây là 9. Nếu dùng MIN thì kết quả sẽ là 2.",
      },
    ],
  },
  {
    id: "co-so-du-lieu",
    name: "Cơ sở dữ liệu & SQL",
    tagline: "SELECT, WHERE, ORDER BY — chạm tay vào dữ liệu thật",
    icon: "Database",
    colorFrom: "#fbbf24",
    colorTo: "#d97706",
    questions: [
      {
        content: "SQL là viết tắt của cụm từ nào?",
        options: [
          "Structured Query Language",
          "Simple Query Language",
          "Standard Question Language",
          "Structured Quick Language",
        ],
        correctIndex: 0,
        explanation:
          "SQL = Structured Query Language (ngôn ngữ truy vấn có cấu trúc) — ngôn ngữ chung để \"nói chuyện\" với hầu hết mọi cơ sở dữ liệu quan hệ: MySQL, PostgreSQL, SQL Server...",
      },
      {
        content: "Câu lệnh SQL nào dùng để LẤY (đọc) dữ liệu từ một bảng?",
        options: ["GET", "SELECT", "FETCH", "READ"],
        correctIndex: 1,
        explanation:
          "SELECT là câu lệnh đọc dữ liệu: SELECT * FROM sinhvien; nghĩa là \"lấy tất cả các cột từ bảng sinhvien\". Đây là câu lệnh đầu tiên ai học SQL cũng gặp.",
      },
      {
        content: "Từ khóa nào dùng để LỌC các dòng thỏa điều kiện trong câu SELECT?",
        options: ["ORDER BY", "WHERE", "GROUP BY", "LIMIT"],
        correctIndex: 1,
        explanation:
          "WHERE đặt điều kiện lọc: SELECT * FROM sinhvien WHERE diem >= 5; chỉ trả về sinh viên có điểm từ 5 trở lên.",
      },
      {
        content: "MySQL là gì?",
        options: [
          "Một hệ quản trị cơ sở dữ liệu quan hệ",
          "Một ngôn ngữ lập trình",
          "Một hệ điều hành",
          "Một trình duyệt web",
        ],
        correctIndex: 0,
        explanation:
          "MySQL là hệ quản trị CSDL quan hệ (RDBMS) — phần mềm lưu trữ và quản lý dữ liệu dạng bảng. Còn SQL là NGÔN NGỮ dùng để giao tiếp với nó. Đừng nhầm hai khái niệm này nhé!",
      },
      {
        content: "Khóa chính (PRIMARY KEY) của một bảng dùng để làm gì?",
        options: [
          "Mã hóa dữ liệu trong bảng",
          "Định danh DUY NHẤT cho mỗi dòng dữ liệu",
          "Tự động tăng tốc mọi truy vấn",
          "Sắp xếp dữ liệu trong bảng",
        ],
        correctIndex: 1,
        explanation:
          "Primary key (khóa chính) là cột có giá trị duy nhất, không trùng, không NULL — như số CCCD của mỗi ngườat. Nhờ nó, database phân biệt được từng dòng một.",
      },
      {
        content: "Câu lệnh SQL nào dùng để THÊM một dòng dữ liệu mới vào bảng?",
        options: ["INSERT INTO", "ADD ROW", "UPDATE", "CREATE TABLE"],
        correctIndex: 0,
        explanation:
          "INSERT INTO sinhvien (ten, diem) VALUES ('An', 8.5); thêm một dòng mới. UPDATE thì SỬA dòng có sẵn, còn CREATE TABLE tạo bảng mới.",
      },
      {
        content: "Để sắp xếp kết quả truy vấn theo cột diem GIẢM DẦN, ta viết thế nào?",
        options: [
          "ORDER BY diem DESC",
          "SORT BY diem DOWN",
          "ORDER diem DESC",
          "GROUP BY diem DESC",
        ],
        correctIndex: 0,
        explanation:
          "ORDER BY ten_cot DESC = giảm dần (DESC = descending), ASC = tăng dần (mặc định). Ví dụ: SELECT * FROM sinhvien ORDER BY diem DESC;",
      },
      {
        content: "Câu lệnh DELETE FROM sinhvien; (không có WHERE) sẽ làm gì?",
        options: [
          "Xóa luôn cả bảng sinhvien",
          "Xóa TOÀN BỘ các dòng trong bảng",
          "Báo lỗi cú pháp ngay",
          "Chỉ xóa dòng đầu tiên",
        ],
        correctIndex: 1,
        explanation:
          "DELETE không có WHERE = xóa SẠCH mọi dòng (bảng vẫn còn, chỉ mất dữ liệu). Đây là lỗi \"kinh điển\" của ngườat mới học SQL — luôn kiểm tra kỹ mệnh đề WHERE trước khi bấm Enter!",
      },
    ],
  },
];

async function main() {
  console.log("Đang nạp chuyên đề và câu hỏi...");
  let insertedQuestions = 0;

  for (const [i, t] of TOPIC_DATA.entries()) {
    await db.insert(topics).values({
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      icon: t.icon,
      colorFrom: t.colorFrom,
      colorTo: t.colorTo,
      sortOrder: i,
    }).onConflictDoNothing();

    const existingQuestions = await db
      .select({ content: questions.content })
      .from(questions)
      .where(eq(questions.topicId, t.id));
    const existingContent = new Set(existingQuestions.map((q) => q.content));
    const candidates = [
      ...t.questions,
      ...getExpandedQuestions(t.id),
    ];
    const newQuestions = [];

    for (const question of candidates) {
      if (existingContent.has(question.content)) continue;
      if (existingQuestions.length + newQuestions.length >= 40) break;
      existingContent.add(question.content);
      newQuestions.push({
        topicId: t.id,
        content: question.content,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      });
    }

    if (newQuestions.length > 0) {
      await db.insert(questions).values(newQuestions);
    }

    const totalAfterBasic = existingQuestions.length + newQuestions.length;
    const advancedToAdd = Math.max(0, 50 - totalAfterBasic);
    const advancedQuestions = getAdvancedQuestions(t.id);
    const newAdvancedQuestions = [];
    for (const question of advancedQuestions) {
      if (newAdvancedQuestions.length >= advancedToAdd) break;
      if (existingContent.has(question.content)) continue;
      existingContent.add(question.content);
      newAdvancedQuestions.push({
        topicId: t.id,
        content: question.content,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        difficulty: "advanced",
      });
    }
    if (newAdvancedQuestions.length > 0) {
      await db.insert(questions).values(newAdvancedQuestions);
    }

    const additionCandidates = getAdditionalQuestions(t.id);
    if (additionCandidates.length !== 50 || new Set(additionCandidates.map((question) => question.content)).size !== 50) {
      throw new Error(`${t.name}: bộ câu hỏi bổ sung phải có đúng 50 câu.`);
    }
    const targetAdditions = Math.max(
      0,
      100 - existingQuestions.length - newQuestions.length - newAdvancedQuestions.length
    );
    const additions = additionCandidates
      .filter((question) => !existingContent.has(question.content))
      .slice(0, targetAdditions);
    for (const question of additionCandidates) {
      if (additions.length >= targetAdditions) break;
      if (!existingContent.has(question.content)) continue;
      let content = `${question.content} [Bổ sung]`;
      if (existingContent.has(content)) continue;
      let suffix = 2;
      while (existingContent.has(content)) {
        content = `${question.content} [Bổ sung ${suffix}]`;
        suffix += 1;
      }
      additions.push({ ...question, content });
      existingContent.add(content);
    }
    if (additions.length !== targetAdditions) {
      throw new Error(`${t.name}: không thể bổ sung đủ để đạt 100 câu.`);
    }
    if (additions.length > 0) {
      await db.insert(questions).values(additions.map((question) => ({
        topicId: t.id,
        content: question.content,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        difficulty: question.difficulty,
      })));
    }
    for (const question of additions) existingContent.add(question.content);

    insertedQuestions += newQuestions.length + newAdvancedQuestions.length + additions.length;
    console.log(
      `  ✓ ${t.name}: ${totalAfterBasic + newAdvancedQuestions.length + additions.length} câu (${newQuestions.length + newAdvancedQuestions.length + additions.length} câu mới)`
    );
  }

  console.log(
    `\nHoàn tất! Đã kiểm tra ${TOPIC_DATA.length} chuyên đề, thêm ${insertedQuestions} câu hỏi mới.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
