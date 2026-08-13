# Apple Watch Performance Dashboard

แดชบอร์ดเปรียบเทียบยอดขาย Apple Watch กับ Target เดือนล่าสุด พร้อม MoM และ YoY แยกตามร้าน RM และ AM

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
