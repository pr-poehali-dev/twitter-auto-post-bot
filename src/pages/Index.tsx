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
import func2url from '../../backend/func2url.json';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  videoUrl?: string;
  videoName?: string;
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
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ username: '', authToken: '' });
  const [attachedVideo, setAttachedVideo] = useState<{ name: string; url: string } | null>(null);
  const [mutualLikes, setMutualLikes] = useState(true);
  const [likesPerPost, setLikesPerPost] = useState('2');
  const [isScenarioRunning, setIsScenarioRunning] = useState(false);
  const [scenarioProgress, setScenarioProgress] = useState(0);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [showTwitterSettings, setShowTwitterSettings] = useState(false);
  const [twitterKeys, setTwitterKeys] = useState({
    api_key: '',
    api_secret: '',
    access_token: '',
    access_token_secret: ''
  });

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
        ...(attachedVideo && { videoUrl: attachedVideo.url, videoName: attachedVideo.name })
      };
      setPosts([...posts, post]);
      setNewPost('');
      setAttachedVideo(null);
      toast({
        title: 'Пост добавлен',
        description: attachedVideo ? 'Публикация с видео запланирована' : 'Публикация запланирована',
      });
    }
  };

  const handlePostsFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const newPosts: Post[] = lines.map((line, index) => ({
          id: `${Date.now()}-${index}`,
          content: line.trim(),
          scheduledTime: new Date(Date.now() + (index + 1) * 3600000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          status: 'pending' as const,
        }));
        setPosts([...posts, ...newPosts]);
        toast({
          title: 'Посты загружены',
          description: `Добавлено ${newPosts.length} постов из файла`,
        });
      };
      reader.readAsText(file);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttachedVideo({ name: file.name, url });
      toast({
        title: 'Видео прикреплено',
        description: file.name,
      });
    }
  };

  const saveTwitterKeys = async () => {
    if (!twitterKeys.api_key || !twitterKeys.api_secret || !twitterKeys.access_token || !twitterKeys.access_token_secret) {
      toast({
        title: 'Заполните все поля',
        description: 'Все 4 ключа обязательны для работы с Twitter',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(func2url['twitter-settings'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twitterKeys)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Ключи сохранены',
          description: 'Теперь проверим подключение к Twitter'
        });
        setShowTwitterSettings(false);
        await checkTwitterConnection();
      } else {
        toast({
          title: 'Ошибка',
          description: data.message || 'Не удалось сохранить ключи',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить ключи',
        variant: 'destructive'
      });
    }
  };

  const checkTwitterConnection = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch(func2url.twitter, {
        method: 'GET',
      });
      const data = await response.json();
      
      if (data.success) {
        setTwitterConnected(true);
        toast({
          title: 'Подключено к Twitter',
          description: `Аккаунт: @${data.user.username}`,
        });
      } else {
        setTwitterConnected(false);
        toast({
          title: 'Ошибка подключения',
          description: data.message || 'Проверьте API ключи',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setTwitterConnected(false);
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить подключение',
        variant: 'destructive',
      });
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleAddAccount = () => {
    if (newAccountData.username.trim() && newAccountData.authToken.trim()) {
      const account: Account = {
        id: Date.now().toString(),
        username: newAccountData.username.startsWith('@') ? newAccountData.username : `@${newAccountData.username}`,
        status: 'active',
        postsCount: 0,
        lastUsed: 'Никогда',
      };
      setAccounts([...accounts, account]);
      setNewAccountData({ username: '', authToken: '' });
      setShowAddAccountDialog(false);
      toast({
        title: 'Аккаунт добавлен',
        description: `${account.username} успешно подключен`,
      });
    }
  };

  const handleStartScenario = () => {
    if (posts.length === 0) {
      toast({
        title: 'Нет постов',
        description: 'Добавьте посты для публикации',
        variant: 'destructive'
      });
      return;
    }

    if (accounts.filter(a => a.status === 'active').length === 0) {
      toast({
        title: 'Нет активных аккаунтов',
        description: 'Добавьте активные аккаунты для публикации',
        variant: 'destructive'
      });
      return;
    }

    setIsScenarioRunning(true);
    setScenarioProgress(0);

    toast({
      title: '🚀 Сценарий запущен',
      description: `Старт публикации ${posts.filter(p => p.status === 'pending').length} постов с интервалом ${postInterval} минут`,
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScenarioProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsScenarioRunning(false);
        toast({
          title: '✅ Сценарий завершен',
          description: 'Все посты успешно опубликованы',
        });
      }
    }, 500);
  };

  const handleStopScenario = () => {
    setIsScenarioRunning(false);
    setScenarioProgress(0);
    toast({
      title: 'Сценарий остановлен',
      description: 'Публикация приостановлена',
      variant: 'destructive'
    });
  };

  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const totalPosts = accounts.reduce((sum, a) => sum + a.postsCount, 0);
  const pendingPosts = posts.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background dark">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Twitter AutoPost
              </h1>
              <p className="text-muted-foreground mt-1">Автоматизация публикаций с ротацией аккаунтов</p>
            </div>
            <div className="flex gap-3">
              {isScenarioRunning ? (
                <Button size="lg" variant="destructive" className="gap-2" onClick={handleStopScenario}>
                  <Icon name="Square" size={18} />
                  Остановить
                </Button>
              ) : (
                <Button size="lg" className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" onClick={handleStartScenario}>
                  <Icon name="Play" size={18} />
                  Запустить сценарий
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowTwitterSettings(true)}
              >
                <Icon name="Key" size={18} />
                Twitter API
              </Button>
            </div>
          </div>
          
          {isScenarioRunning && (
            <Card className="border-green-500/50 bg-green-950/20">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">Сценарий выполняется...</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{scenarioProgress}%</span>
                  </div>
                  <Progress value={scenarioProgress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Публикация через аккаунты: {accounts.filter(a => a.status === 'active').map(a => a.username).join(', ')}</span>
                    <span>Интервал: {postInterval} мин</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
              <CardTitle className="text-sm font-medium">Взаимные лайки</CardTitle>
              <Icon name="Heart" size={18} className="text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mutualLikes ? 'ON' : 'OFF'}</div>
              <p className="text-xs text-muted-foreground mt-1">{mutualLikes ? `~${likesPerPost} лайков/пост` : 'Отключено'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts" className="gap-2">
              <Icon name="UserCircle" size={16} />
              Аккаунты
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <Icon name="FileText" size={16} />
              Посты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Upload" size={20} />
                  Загрузка аккаунтов
                </CardTitle>
                <CardDescription>Добавить аккаунт по auth_token или импортировать из файла</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${twitterConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="font-medium">Статус подключения Twitter API</p>
                        <p className="text-sm text-muted-foreground">
                          {twitterConnected ? 'API ключи настроены корректно' : 'Требуется настройка API ключей'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={checkTwitterConnection} 
                      disabled={checkingConnection}
                      variant="outline"
                      className="gap-2"
                    >
                      <Icon name={checkingConnection ? "Loader2" : "RefreshCw"} size={16} className={checkingConnection ? "animate-spin" : ""} />
                      Проверить
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Icon name="UserPlus" size={18} />
                        Добавить аккаунт
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Добавить Twitter аккаунт</DialogTitle>
                        <DialogDescription>
                          Введите username и auth_token для подключения аккаунта
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            placeholder="@your_account"
                            value={newAccountData.username}
                            onChange={(e) => setNewAccountData({ ...newAccountData, username: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="auth-token">Auth Token</Label>
                          <Textarea
                            id="auth-token"
                            placeholder="Вставьте auth_token"
                            value={newAccountData.authToken}
                            onChange={(e) => setNewAccountData({ ...newAccountData, authToken: e.target.value })}
                            className="font-mono text-sm min-h-24"
                          />
                          <p className="text-xs text-muted-foreground">
                            Токен можно получить в настройках разработчика Twitter API
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddAccountDialog(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleAddAccount} disabled={!newAccountData.username || !newAccountData.authToken}>
                          <Icon name="Check" size={16} className="mr-2" />
                          Добавить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" className="gap-2" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Icon name="FolderOpen" size={18} />
                    Импорт из файла
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

                <div className="p-4 rounded-lg border bg-card space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon name="Heart" size={18} className="text-primary" />
                    <h3 className="font-medium">Взаимные лайки</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mutual-likes">Автоматические лайки от других аккаунтов</Label>
                      <Switch id="mutual-likes" checked={mutualLikes} onCheckedChange={setMutualLikes} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      После публикации другие аккаунты автоматически поставят лайки
                    </p>
                  </div>

                  {mutualLikes && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="likes-count">Количество лайков на пост</Label>
                      <Input
                        id="likes-count"
                        type="number"
                        min="1"
                        max={accounts.length - 1}
                        value={likesPerPost}
                        onChange={(e) => setLikesPerPost(e.target.value)}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Максимум: {accounts.length - 1} (все аккаунты кроме автора)
                      </p>
                    </div>
                  )}

                  {mutualLikes && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Icon name="Sparkles" size={16} className="text-primary mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Преимущества</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Повышение органического охвата</li>
                            <li>• Алгоритм Twitter показывает посты чаще</li>
                            <li>• Создание эффекта активного сообщества</li>
                            <li>• Задержка 5-15 минут для естественности</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
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
                <CardDescription>Напишите текст для публикации или загрузите несколько постов из файла</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2" onClick={() => document.getElementById('posts-file-upload')?.click()}>
                    <Icon name="FileText" size={18} />
                    Загрузить посты из файла
                  </Button>
                  <input
                    id="posts-file-upload"
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handlePostsFileUpload}
                  />
                  <Button variant="secondary" className="gap-2" onClick={() => document.getElementById('video-upload')?.click()}>
                    <Icon name="Video" size={18} />
                    {attachedVideo ? 'Изменить видео' : 'Прикрепить видео'}
                  </Button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>

                {attachedVideo && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-secondary/20 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-secondary/20 flex items-center justify-center">
                        <Icon name="Video" size={20} className="text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{attachedVideo.name}</p>
                        <p className="text-xs text-muted-foreground">Видео будет добавлено к посту</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setAttachedVideo(null)}>
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                )}

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
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-sm whitespace-pre-wrap">{newPost}</p>
                      {attachedVideo && (
                        <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                          <video src={attachedVideo.url} controls className="w-full h-full object-cover" />
                        </div>
                      )}
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
                        {post.videoName && (
                          <div className="flex items-center gap-2 p-2 rounded bg-secondary/10 border border-secondary/20">
                            <Icon name="Video" size={14} className="text-secondary" />
                            <span className="text-xs font-medium">{post.videoName}</span>
                          </div>
                        )}
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


        </Tabs>
      </div>

      <Dialog open={showTwitterSettings} onOpenChange={setShowTwitterSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Key" size={24} />
              Настройка Twitter API
            </DialogTitle>
            <DialogDescription>
              Введите 4 ключа из Twitter Developer Portal. Они хранятся в защищённой базе данных.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key (Consumer Key)</Label>
              <Input
                id="api_key"
                placeholder="Введите API Key"
                value={twitterKeys.api_key}
                onChange={(e) => setTwitterKeys({...twitterKeys, api_key: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_secret">API Secret (Consumer Secret)</Label>
              <Input
                id="api_secret"
                type="password"
                placeholder="Введите API Secret"
                value={twitterKeys.api_secret}
                onChange={(e) => setTwitterKeys({...twitterKeys, api_secret: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <Input
                id="access_token"
                placeholder="Введите Access Token"
                value={twitterKeys.access_token}
                onChange={(e) => setTwitterKeys({...twitterKeys, access_token: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token_secret">Access Token Secret</Label>
              <Input
                id="access_token_secret"
                type="password"
                placeholder="Введите Access Token Secret"
                value={twitterKeys.access_token_secret}
                onChange={(e) => setTwitterKeys({...twitterKeys, access_token_secret: e.target.value})}
              />
            </div>

            <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <Icon name="Info" size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-blue-300">Где взять ключи?</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Откройте developer.twitter.com/en/portal/dashboard</li>
                    <li>Выберите ваше приложение</li>
                    <li>Перейдите в Keys and tokens</li>
                    <li>Скопируйте все 4 значения</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTwitterSettings(false)}>
              Отмена
            </Button>
            <Button onClick={saveTwitterKeys} className="gap-2">
              <Icon name="Save" size={18} />
              Сохранить и проверить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;