// Supabase 연동 설정 (anon key는 공개 전제: RLS 전면 차단, 쓰기·읽기는 Edge Function 경유)
window.JANGNAL_CONFIG = {
  FUNCTIONS_URL: "https://ucspzjwckonvoorwzauu.supabase.co/functions/v1",
  ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc3B6andja29udm9vcnd6YXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzQxNDksImV4cCI6MjA5ODU1MDE0OX0.Hi5ZTYEx68VmA0ZPcT1ONKL4Teji1tdHrS6qxk8OOhs",
};
