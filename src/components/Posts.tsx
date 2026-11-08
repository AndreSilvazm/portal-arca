'use client'

import { ReactNode, useState } from 'react'
import WorkspaceShell from './Workspace'
import PostForm, { RichText } from './PostForm'
import { Arrow, Label } from './ui'
import { openDoc } from '@/lib/files'
import { formatDate, Post, PostType, useStore } from '@/lib/store'

export function PostCard({ post }: { post: Post }) {
  return <article>
    <div className="post-meta"><span>{post.type}</span><time>{formatDate(post.createdAt)}</time></div>
    <h2>{post.title}</h2>
    <p><RichText text={post.text}/></p>
    {post.files.map(f => <button className="attachment" key={f.path ?? f.name} onClick={() => openDoc(f)}><b>{f.name.split('.').pop()?.toUpperCase().slice(0, 4)}</b><span>{f.name}</span><Arrow/></button>)}
    <footer><div className="mini-avatar">AR</div><span>Publicado por <b>{post.author}</b></span></footer>
  </article>
}

export function PostsPage({ active, type, label, title, text }: { active: string; type: PostType; label: string; title: string; text: string }) {
  const { session, posts } = useStore()
  const [composer, setComposer] = useState(false)
  const visible = posts.filter(p => p.type === type)
  return <WorkspaceShell active={active}>
    <div className="feed-layout single"><section className="feed-main">
      <div className="feed-title"><div><Label>{label}</Label><h1>{title}</h1><p>{text}</p></div>{session?.admin && <button onClick={() => setComposer(!composer)}>+ Nova publicação</button>}</div>
      {composer && <PostForm initialType={type} onCreated={() => setComposer(false)}/>}
      <div className="internal-feed">{visible.length ? visible.map(p => <PostCard key={p.id} post={p}/>) : <p className="empty">Nada publicado nesta seção ainda.</p>}</div>
    </section></div>
  </WorkspaceShell>
}

export function Page({ active, label, title, text, action, children }: { active: string; label: string; title: string; text: string; action?: ReactNode; children: ReactNode }) {
  return <WorkspaceShell active={active}>
    <div className="feed-layout single"><section className="feed-main">
      <div className="feed-title"><div><Label>{label}</Label><h1>{title}</h1><p>{text}</p></div>{action}</div>
      {children}
    </section></div>
  </WorkspaceShell>
}
