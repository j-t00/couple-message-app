'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8)
}

function generateUserId() {
  return Math.random().toString(36).substring(2, 12)
}

export default function Home() {
  const router = useRouter()

  const createRoom = async () => {
    // ユーザーIDをlocalStorageに保存
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', generateUserId())
    }

    const roomCode = generateRoomCode()

    const { error } = await supabase
      .from('rooms')
      .insert({ room_code: roomCode })

    if (error) {
      alert('ルーム作成に失敗しました')
      return
    }

    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-pink-400">💌 ふたりアプリ</h1>
        <p className="text-gray-500 text-center">
          ルームを作って、URLを恋人に送ろう！
        </p>
        <button
          onClick={createRoom}
          className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full transition"
        >
          ルームを作る
        </button>
      </div>
    </main>
  )
}