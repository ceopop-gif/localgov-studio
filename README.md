# LocalGov Studio

ระบบเว็บไซต์สำเร็จรูปสำหรับ อบต. เทศบาล และองค์กรปกครองส่วนท้องถิ่น

## ส่วนประกอบหลัก

- ศูนย์บริหารกลางสำหรับสร้างและควบคุมหลายเว็บไซต์
- หลังบ้าน CMS แยกข้อมูลและสิทธิ์ของแต่ละหน่วยงาน
- ข่าว ประกาศ ITA/OIT จัดซื้อจัดจ้าง และคลังไฟล์
- ระบบคำร้องประชาชนพร้อมเลขรับเรื่องและติดตามสถานะ
- หน้าบ้าน Mobile First พร้อมเครื่องมือช่วยการเข้าถึง
- Supabase PostgreSQL สำหรับข้อมูล และ R2 สำหรับเอกสาร/สื่อ
- ประวัติการทำงาน การตรวจสิทธิ์ SEO และข้อควรระวังด้าน PDPA

## การตั้งค่าเซิร์ฟเวอร์

ตั้งค่า `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` และ **server secret** `SUPABASE_SECRET_KEY` ใน runtime ของเว็บไซต์ คีย์ลับต้องไม่อยู่ใน Git หรือส่งให้เบราว์เซอร์

ใช้ `supabase/schema.sql` และ `supabase/application-operations.sql` สำหรับโครงสร้างและคำสั่งบันทึกข้อมูลแบบ transaction โดยเปิด schema `localgov` ผ่าน Data API และให้สิทธิ์เฉพาะ `service_role` ทุกตารางเปิด RLS และปิดสิทธิ์ `anon`/`authenticated` แอปตรวจสิทธิ์ผู้ดูแลจากเซสชันเดิมก่อนใช้ฐานข้อมูล

โปรเจกต์นี้เปิด schema ผ่าน `ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, localgov'` ดังนั้นค่าดังกล่าวควบคุมจากฐานข้อมูล ไม่ใช่ช่อง Exposed schemas ใน Dashboard หากเปลี่ยนวิธีจัดการต้องตรวจและรักษารายการ schema เดิมก่อน

ตั้ง runtime secrets `LOCAL_ADMIN_USERNAME_SHA256` และ `LOCAL_ADMIN_PASSWORD_SHA256` เป็นค่า SHA-256 hexadecimal ตัวพิมพ์เล็กของข้อมูลล็อกอินที่เลือก ระบบปฏิเสธการเข้าสู่ระบบแบบ local หากไม่ตั้งค่า ไม่มีข้อมูลล็อกอินเริ่มต้นฝังในซอร์ส

ไฟล์สื่อยังอยู่ใน R2 โดย metadata อยู่ใน Supabase ไม่เปลี่ยน URL ไฟล์เดิม D1 ถูกเก็บไว้เป็นต้นฉบับก่อนย้าย และแอปเวอร์ชัน Supabase ไม่เขียนข้อมูลใหม่ลง D1

## ตรวจสอบและสร้าง

- `npx tsc --noEmit --incremental false`
- `node --test tests/supabase-rest.test.mjs`
- `npm run build`
- `tests/supabase-operations.sql` ทดสอบ transaction, สิทธิ์ข้ามหน่วยงาน, คำร้อง, สื่อ และเซสชัน โดย rollback ข้อมูลทดสอบทั้งหมด

ดูสถานะการย้ายและข้อจำกัดใน `supabase/CONNECTION_STATUS.md` และคู่มือหน่วยงานใน `docs/local-government-website-skill-th.md`

Repository มีเฉพาะซอร์สและโครงสร้างฐานข้อมูล ไม่รวมข้อมูลประชาชน ไฟล์อัปโหลด หรือ runtime secrets การอัปเดต GitHub ไม่ได้เผยแพร่เว็บไซต์อัตโนมัติ
