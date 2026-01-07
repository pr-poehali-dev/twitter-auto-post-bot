import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

interface Account {
  id: string;
  username: string;
  status: 'active' | 'paused' | 'error';
  postsCount: number;
  lastUsed: string;
}

interface Post {
  id: string;
  content: string;
  scheduledTime: string;
  status: 'pending' | 'published' | 'failed';
  accountId?: string;
}

const Index = () => {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', username: '@techblog_ai', status: 'active', postsCount: 24, lastUsed: '2 часа назад' },
    { id: '2', username: '@marketpro_2024', status: 'active', postsCount: 18, lastUsed: '5 часов назад' },
    { id: '3', username: '@startup_news', status: 'paused', postsCount: 31, lastUsed: '1 день назад' },
  ]);

  const [posts, setPosts] = useState<Post[]>([
    { id: '1', content: 'Новые возможности AI в 2024 году меняют всё! 🚀', scheduledTime: '15:00', status: 'pending' },
    { id: '2', content: 'Топ-5 трендов в маркетинге этого месяца', scheduledTime: '18:30', status: 'pending' },
  ]);

  const [newPost, setNewPost] = useState('');
  const [autoRotation, setAutoRotation] = useState(true);
  const [postInterval, setPostInterval] = useState('30');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: 'Файл загружен',
        description: `Обработано аккаунтов: ${Math.floor(Math.random() * 20) + 5}`,
      });
    }
  };

  const handleAddPost = () => {
    if (newPost.trim()) {
      const post: Post = {
        id: Date.now().toString(),
        content: newPost,
        scheduledTime: new Date(Date.now() + 3600000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
      };
      setPosts([...posts, post]);
      setNewPost('');
      toast({
        title: 'Пост добавлен',
        description: 'Публикация запланирована',
      });
    }
  };

  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const totalPosts = accounts.reduce((sum, a) => sum + a.postsCount, 0);
  const pendingPosts = posts.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background dark">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Twitter AutoPost
            </h1>
            <p className="text-muted-foreground mt-1">Автоматизация публикаций с ротацией аккаунтов</p>
          </div>
          <Button size="lg" className="gap-2">
            <Icon name="Settings" size={18} />
            Настройки API
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Активных аккаунтов</CardTitle>
              <Icon name="Users" size={18} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeAccounts}</div>
              <p className="text-xs text-muted-foreground mt-1">Из {accounts.length} загруженных</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Опубликовано</CardTitle>
              <Icon name="Send" size={18} className="text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">Всего постов</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">В очереди</CardTitle>
              <Icon name="Clock" size={18} className="text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">Запланировано</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ротация</CardTitle>
              <Icon name="RefreshCw" size={18} className="text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{autoRotation ? 'ON' : 'OFF'}</div>
              <p className="text-xs text-muted-foreground mt-1">Авто-переключение</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accounts" className="gap-2">
              <Icon name="UserCircle" size={16} />
              Аккаунты
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <Icon name="FileText" size={16} />
              Посты
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Icon name="Calendar" size={16} />
              Расписание
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Upload" size={20} />
                  Загрузка аккаунтов
                </CardTitle>
                <CardDescription>Импорт из CSV или TXT файла (формат: username, api_key, api_secret)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button variant="outline" className="gap-2" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Icon name="FolderOpen" size={18} />
                    Выбрать файл
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="secondary" className="gap-2">
                    <Icon name="Download" size={18} />
                    Скачать шаблон
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rotation">Автоматическая ротация</Label>
                    <Switch id="rotation" checked={autoRotation} onCheckedChange={setAutoRotation} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Равномерное распределение постов между аккаунтами для избежания блокировок
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Интервал между постами (минуты)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={postInterval}
                    onChange={(e) => setPostInterval(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список аккаунтов</CardTitle>
                <CardDescription>Управление загруженными Twitter-аккаунтами</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon name="Twitter" size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-mono font-medium">{account.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.postsCount} постов · Последний: {account.lastUsed}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={account.status === 'active' ? 'default' : account.status === 'paused' ? 'secondary' : 'destructive'}
                        >
                          {account.status === 'active' ? 'Активен' : account.status === 'paused' ? 'Пауза' : 'Ошибка'}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Icon name="MoreVertical" size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="PenSquare" size={20} />
                  Создать пост
                </CardTitle>
                <CardDescription>Напишите текст для публикации в Twitter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Что происходит?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-32 resize-none"
                    maxLength={280}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{newPost.length}/280</span>
                    <Progress value={(newPost.length / 280) * 100} className="w-24 h-1" />
                  </div>
                </div>

                {newPost && (
                  <Card className="border-primary/20 bg-primary/5 animate-fade-in">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon name="User" size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Предпросмотр</p>
                          <p className="text-xs text-muted-foreground">@your_account · Сейчас</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm whitespace-pre-wrap">{newPost}</p>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={handleAddPost} className="w-full gap-2" disabled={!newPost.trim()}>
                  <Icon name="Plus" size={18} />
                  Добавить в очередь
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Очередь публикаций</CardTitle>
                <CardDescription>Запланированные и опубликованные посты</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <p className="text-sm">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" size={12} />
                            {post.scheduledTime}
                          </span>
                          {post.accountId && (
                            <span className="flex items-center gap-1">
                              <Icon name="User" size={12} />
                              Аккаунт #{post.accountId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={post.status === 'pending' ? 'secondary' : post.status === 'published' ? 'default' : 'destructive'}>
                          {post.status === 'pending' ? 'Ожидание' : post.status === 'published' ? 'Опубликован' : 'Ошибка'}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="CalendarClock" size={20} />
                  Расписание публикаций
                </CardTitle>
                <CardDescription>Настройка времени и частоты постинга</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-7 gap-2">
                  {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((day, index) => (
                    <Button
                      key={day}
                      variant={index < 5 ? 'default' : 'outline'}
                      className="h-12"
                      size="sm"
                    >
                      {day}
                    </Button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Временные слоты</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['09:00', '12:00', '15:00', '18:00', '21:00'].map((time) => (
                        <Button key={time} variant="outline" className="justify-start gap-2 h-12">
                          <Icon name="Clock" size={16} />
                          {time}
                        </Button>
                      ))}
                      <Button variant="secondary" className="justify-start gap-2 h-12">
                        <Icon name="Plus" size={16} />
                        Добавить время
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon name="Info" size={16} className="text-primary" />
                      Статистика распределения
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Постов в день:</span>
                        <span className="font-mono font-medium">5-7</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Нагрузка на аккаунт:</span>
                        <span className="font-mono font-medium">~2 поста/день</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Время ротации:</span>
                        <span className="font-mono font-medium">{postInterval} минут</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
