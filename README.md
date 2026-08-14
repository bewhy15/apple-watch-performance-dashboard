# Apple Watch Performance Dashboard

แดชบอร์ดเปรียบเทียบยอดขาย Apple Watch กับ Target เดือนล่าสุด พร้อม MoM และ YoY แยกตามร้าน RM และ AM

Forecast คำนวณจาก pace ของยอดขายสะสมถึงวันที่ล่าสุดใน Google Sheet คูณจำนวนวันทั้งหมดของเดือน และ `% Forecast` คือ Forecast เทียบกับ Target

หน้า `ภาพรวม RM & AM` แสดงอันดับรูปแบบสาขา (Channel), RM และ AM ต่อกัน โดย Channel จับคู่จาก Branch ID ในไฟล์ `tier.xlsx`; ร้านที่ยังไม่มี mapping จะแสดงเป็น `ไม่ระบุ` เพื่อไม่เดาประเภทสาขา

ปุ่ม `บันทึกทั้งหน้า` สร้างไฟล์ PNG จากมุมมองและตัวกรองที่เลือก โดยเก็บข้อมูลครบทุกแถวและทุกคอลัมน์ แม้ตารางยาวกว่าหน้าจอ บนมือถือระบบจะเปิดเมนูแชร์/บันทึกรูปของอุปกรณ์เมื่อรองรับ

Dashboard ตรวจข้อมูลใหม่จาก Supabase อัตโนมัติทุก 1 นาทีขณะเปิดหน้าอยู่ และสามารถกด `รีเฟรชข้อมูล` เพื่ออัปเดตหน้าจอทันทีได้

Supabase Edge Function `sync-google-sheet` ถูกเรียกด้วย Database Cron ทุก 5 นาที เพื่ออ่าน Target เดือนล่าสุดและยอดขาย MTD ช่วงวันเดียวกันของเดือนปัจจุบัน เดือนก่อน และปีก่อนจาก Google Sheet แล้วแทนที่ snapshot ในฐานข้อมูลแบบ transaction เดียว หากการอ่านหรือ validation ล้มเหลว ระบบจะเก็บ snapshot เดิมไว้

## Requirements

- Node.js 20.19 ขึ้นไป
- pnpm 10

## Local development

```bash
pnpm install
pnpm dev
```

ตรวจ production build ด้วย:

```bash
pnpm build
pnpm preview
```

## Data source

หน้าเว็บอ่านข้อมูลจาก Supabase view `aw_dashboard_rows` โดยใช้ publishable key ซึ่งเปิดเผยใน browser ได้ตามการออกแบบของ Supabase การควบคุมสิทธิ์ต้องทำด้วย Row Level Security ที่ฐานข้อมูล

Target ใน view ต้องเป็นเดือนล่าสุดเพียงเดือนเดียว ส่วนยอดเปรียบเทียบประกอบด้วยยอดเดือนปัจจุบัน เดือนก่อน และเดือนเดียวกันของปีก่อน

## GitHub and Vercel

โปรเจกต์นี้เป็น Vite React static site และใช้ `pnpm-lock.yaml` เป็น lockfile เดียว

1. สร้าง GitHub repository แล้ว push โฟลเดอร์นี้ไปยัง branch `main`
2. Import repository ใน Vercel
3. Vercel จะอ่านค่าจาก `vercel.json` และสร้างไฟล์ใน `dist`
4. ทุก push จะสร้าง Preview Deployment และการ merge เข้า `main` จะสร้าง Production Deployment เมื่อเปิด Git integration

ไม่มี environment variable ที่จำเป็นสำหรับค่า Supabase ปัจจุบัน หากเปลี่ยนไปใช้ค่าจาก environment ให้ตั้งชื่อขึ้นต้นด้วย `VITE_` และเพิ่มใน Vercel Project Settings โดยห้าม commit secret key หรือ service-role key
