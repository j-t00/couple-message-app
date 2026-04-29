'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  sender_id: string
  content: string
  status: string
  created_at: string
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ユーザーID初期化
  useEffect(() => {
    let uid = localStorage.getItem('userId')
    if (!uid) {
      uid = Math.random().toString(36).substring(2, 12)
      localStorage.setItem('userId', uid)
    }
    setUserId(uid)
  }, [])

  // ルームIDの取得 & メッセージ初期ロード
  useEffect(() => {
    if (!roomCode) return

    const init = async () => {
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', roomCode)
        .single()

      if (!room) return
      setRoomId(room.id)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
    }

    init()
  }, [roomCode])

  // リアルタイム購読
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel('messages-' + roomId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // 変更があったら再取得
          supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .then(({ data }) => setMessages(data || []))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // メッセージ送信
  const sendMessage = async () => {
    if (!input.trim() || !roomId) return

    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: input.trim(),
      status: 'pending',
    })

    setInput('')
  }

  // 返答（いいよ / ダメ）
  const respond = async (msgId: string, answer: 'approved' | 'rejected') => {
    await supabase
      .from('messages')
      .update({ status: answer })
      .eq('id', msgId)
  }

  // URLコピー
  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusLabel: Record<string, string> = {
    pending: '⏳ 返答待ち',
    approved: '✅ いいよ！',
    rejected: '❌ ダメ',
  }

  return (
    <main className="flex flex-col h-screen bg-pink-50">
      {/* ヘッダー */}
      <div className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-pink-400 font-bold text-lg">💌 たべてもいい？</h1>
        <button
          onClick={copyUrl}
          className="text-sm bg-pink-100 hover:bg-pink-200 text-pink-500 px-4 py-1 rounded-full transition"
        >
          {copied ? 'コピーした！' : 'URLをコピー'}
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow ${
                isMine ? 'bg-pink-400 text-white' : 'bg-white text-gray-700'
              }`}>
                {msg.content}
              </div>
              <span className="text-xs text-gray-400 mt-1">{statusLabel[msg.status]}</span>

              {/* 相手のメッセージにだけ返答ボタンを表示 */}
              {!isMine && msg.status === 'pending' && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => respond(msg.id, 'approved')}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-600 px-3 py-1 rounded-full"
                  >
                    いいよ
                  </button>
                  <button
                    onClick={() => respond(msg.id, 'rejected')}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-3 py-1 rounded-full"
                  >
                    ダメ
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className="bg-white p-4 flex gap-2 shadow-inner">
        <input
          className="flex-1 border border-pink-200 rounded-full px-4 py-2 text-sm outline-none focus:border-pink-400"
          placeholder="メッセージを送ろう..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-pink-400 hover:bg-pink-500 text-white px-5 py-2 rounded-full text-sm font-bold transition"
        >
          送る
        </button>
      </div>
    </main>
  )
}