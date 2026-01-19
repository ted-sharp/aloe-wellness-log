import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { FaCamera, FaEdit, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import StatusMessage from '../components/StatusMessage';
import { mailSenderRepository } from '../db';
import { goalStore, recordsStore, toastStore } from '../store';
import type { MailSenderInfo } from '../types/mailSender';
import type { WeightRecordV2 } from '../types/record';

/**
 * 週の開始日を取得（月曜日）
 */
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始に
  return new Date(d.setDate(diff));
};

/**
 * 生年から年齢を計算
 */
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

/**
 * 週ごとの体重データサマリー型
 */
type WeeklyWeightSummary = {
  weekStart: string;
  weekEnd: string;
  minWeight: number;
  maxWeight: number;
  recordCount: number;
  weekNum: number;
};

/**
 * メール作成ページ
 * 健康データをメーラー経由で送信するための機能
 */
const MailCompose = observer(() => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('特定保健指導データ送付');
  const [showScreenshotGuide, setShowScreenshotGuide] = useState(false);

  // 差出人情報（メールページで入力）
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');

  // データ読み込み状態
  const [isLoading, setIsLoading] = useState(true);

  // 目標データの取得（参考情報として使用）
  const goalData = goalStore.goal;

  // 体重データの週次サマリー
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklyWeightSummary[]>(
    []
  );

  /**
   * 初期データの読み込み（差出人情報とメール内容）
   * 優先順位: 1. 保存された情報 2. 目標ページの情報
   */
  useEffect(() => {
    const loadSenderInfo = async () => {
      try {
        setIsLoading(true);
        const result = await mailSenderRepository.get();

        // 保存された情報がある場合はそれを使用
        if (result.success && result.data) {
          const info = result.data;
          setSenderName(info.name || '');
          setSenderContact(info.contact || '');
          setRecipient(info.recipient || '');
          setSubject(info.subject || '特定保健指導データ送付');
        } else {
          // 保存された情報がない場合は目標ページから取得
          if (goalData) {
            setSenderName(goalData.name || '');
          }
        }
      } catch (error) {
        console.error('Failed to load sender info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSenderInfo();
  }, [goalData]);

  /**
   * 入力情報の自動保存（入力から500ms後に保存）
   */
  useEffect(() => {
    // 初期読み込み中は保存しない
    if (isLoading) return;

    const timer = setTimeout(() => {
      const saveSenderInfo = async () => {
        const info: MailSenderInfo = {
          name: senderName,
          contact: senderContact,
          recipient: recipient,
          subject: subject,
        };

        const result = await mailSenderRepository.save(info);
        if (!result.success) {
          console.error('Failed to save sender info:', result.error);
        }
      };

      saveSenderInfo();
    }, 500); // 500ms のデバウンス

    return () => clearTimeout(timer);
  }, [
    senderName,
    senderContact,
    recipient,
    subject,
    isLoading,
  ]);

  /**
   * 1ヶ月分の体重データを週ごとに集計
   */
  useEffect(() => {
    const calculateWeeklySummaries = () => {
      const weightRecords = recordsStore.weightRecords;

      // 1ヶ月前の日付を計算
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);

      // 1ヶ月以内のデータをフィルタ
      const recentRecords = weightRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= oneMonthAgo && recordDate <= now;
      });

      if (recentRecords.length === 0) {
        setWeeklySummaries([]);
        return;
      }

      // 目標開始日から週番号を計算するための基準日を決定
      const goalStartDate = goalData?.targetStart
        ? new Date(goalData.targetStart)
        : null;
      const goalStartWeekMonday = goalStartDate
        ? getWeekStart(goalStartDate)
        : null;

      // 週ごとにグループ化
      const weeklyData = new Map<string, WeightRecordV2[]>();

      recentRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const weekStart = getWeekStart(recordDate);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, []);
        }
        weeklyData.get(weekKey)!.push(record);
      });

      // 各週の最低値・最高値を計算
      const summaries: WeeklyWeightSummary[] = [];

      weeklyData.forEach((records, weekStartStr) => {
        const weights = records.map(r => r.weight);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);

        const weekStart = new Date(weekStartStr);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // 目標開始日がある場合はそれを基準に、ない場合は1とする
        let weekNum = 1;
        if (goalStartWeekMonday) {
          const daysDiff = Math.floor(
            (weekStart.getTime() - goalStartWeekMonday.getTime()) / (1000 * 60 * 60 * 24)
          );
          weekNum = Math.floor(daysDiff / 7) + 1;
        }

        summaries.push({
          weekStart: weekStartStr,
          weekEnd: weekEnd.toISOString().split('T')[0],
          minWeight,
          maxWeight,
          recordCount: records.length,
          weekNum,
        });
      });

      // 日付順にソート（古い順）
      summaries.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

      setWeeklySummaries(summaries);
    };

    calculateWeeklySummaries();
  }, [recordsStore.weightRecords, goalData?.targetStart]);

  /**
   * 体重データサマリーの生成
   */
  const generateWeightSummary = (): string => {
    if (weeklySummaries.length === 0) {
      return '体重記録データがありません（過去1ヶ月）';
    }

    const lines: string[] = [];
    lines.push('【体重データ サマリー（過去1ヶ月）】\n');

    weeklySummaries.forEach((summary) => {
      const startDate = new Date(summary.weekStart);
      const endDate = new Date(summary.weekEnd);

      // 日付フォーマット（MM/DD形式）
      const formatDate = (date: Date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
      };

      lines.push(
        `第${summary.weekNum}週（${formatDate(startDate)}～${formatDate(endDate)}）`
      );
      lines.push(`  最高: ${summary.maxWeight.toFixed(1)}kg`);
      lines.push(`  最低: ${summary.minWeight.toFixed(1)}kg`);
      lines.push(`  記録: ${summary.recordCount}件`);
      lines.push('');
    });

    return lines.join('\n');
  };

  // 生活習慣目標の達成率を計算
  const calculateLifestyleAchievementRate = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const dailyRecords = recordsStore.dailyRecords;
    const dailyFields = recordsStore.dailyFields;

    // 過去1ヶ月のレコードをフィルタ
    const recentRecords = dailyRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= oneMonthAgo && recordDate <= now;
    });

    // フィールドごとの達成率を計算
    const achievementRates: {
      fieldName: string;
      rate: number;
      total: number;
    }[] = [];

    dailyFields
      .filter(field => field.display)
      .sort((a, b) => a.order - b.order)
      .forEach(field => {
        const fieldRecords = recentRecords.filter(
          r => r.fieldId === field.fieldId
        );
        if (fieldRecords.length > 0) {
          const totalValue = fieldRecords.reduce((sum, r) => sum + r.value, 0);
          const rate = (totalValue / fieldRecords.length) * 100;
          achievementRates.push({
            fieldName: field.name,
            rate: Math.round(rate),
            total: fieldRecords.length,
          });
        }
      });

    return achievementRates;
  };

  // メール本文の生成
  const generateEmailBody = (): string => {
    const parts: string[] = [];

    // 差出人情報セクション（目標ページとメールページから取得）
    parts.push('【差出人情報】');
    // 氏名（メールページまたは目標ページ）
    const name = senderName.trim() || goalData?.name || '';
    if (name) {
      // 年齢と性別を含める
      const details: string[] = [];
      if (goalData?.birthYear) {
        const age = calculateAge(goalData.birthYear);
        details.push(`${age}歳`);
      }
      if (goalData?.gender) {
        const genderLabel =
          goalData.gender === 'male'
            ? '男性'
            : goalData.gender === 'female'
            ? '女性'
            : 'その他';
        details.push(genderLabel);
      }
      const detailsStr = details.length > 0 ? `（${details.join('、')}）` : '';
      parts.push(`${name}${detailsStr}`);
    }
    // 連絡先（メールページで入力）
    if (senderContact.trim()) {
      parts.push(senderContact.trim());
    }
    parts.push('');

    // 目標データセクション（目標ページから参照）
    if (goalData) {
      parts.push('【目標設定】');
      if (goalData.height) {
        parts.push(`身長: ${goalData.height}cm`);
      }
      if (goalData.targetWeight) {
        parts.push(`目標体重: ${goalData.targetWeight}kg`);
      }
      if (goalData.targetStart) {
        parts.push(`開始日: ${goalData.targetStart}`);
      }
      if (goalData.targetDate) {
        parts.push(`終了日: ${goalData.targetDate}`);
      }
      if (goalData.targetStart) {
        const startDate = new Date(goalData.targetStart);
        const today = new Date();
        const elapsedDays = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        parts.push(`経過日: ${elapsedDays}日`);
      }
      parts.push('');
    }

    // 生活習慣目標と達成率
    const achievementRates = calculateLifestyleAchievementRate();
    if (achievementRates.length > 0) {
      parts.push('【生活習慣目標の達成状況（過去1ヶ月）】');
      achievementRates.forEach(item => {
        parts.push(`${item.fieldName}: ${item.rate}% (${item.total}日間記録)`);
      });
      parts.push('');
    }

    // 体重データサマリーセクション
    parts.push(generateWeightSummary());
    parts.push('');

    // フッター
    parts.push('---');
    parts.push('アロエ健康管理ログより送信');
    parts.push('https://ted-sharp.github.io/aloe-wellness-log/');

    return parts.join('\n');
  };

  // mailtoリンクの生成
  const generateMailtoLink = (): string => {
    const body = generateEmailBody();
    const params = new URLSearchParams({
      subject: subject,
      body: body,
    });

    // 宛先がある場合は追加
    if (recipient.trim()) {
      return `mailto:${encodeURIComponent(
        recipient.trim()
      )}?${params.toString()}`;
    } else {
      return `mailto:?${params.toString()}`;
    }
  };

  // メーラー起動
  const handleOpenMailer = () => {
    // 氏名が未入力の場合はエラー
    const name = senderName.trim() || goalData?.name || '';
    if (!name) {
      toastStore.showError('氏名を入力してください（必須）。');
      return;
    }

    try {
      const mailtoLink = generateMailtoLink();
      window.location.href = mailtoLink;
      toastStore.showSuccess('メーラーを起動しました');
    } catch (error) {
      console.error('Failed to open mailer:', error);
      toastStore.showError('メーラーの起動に失敗しました');
    }
  };

  // メーラー起動ボタンの有効/無効判定
  const canSendMail = !!(senderName.trim() || goalData?.name);

  // プレビュー用の本文取得
  const previewBody = generateEmailBody();

  return (
    <div className="flex flex-col items-center justify-start py-4 bg-transparent min-h-screen">
      <div className="w-full max-w-4xl space-y-6 px-4">
        {/* ページタイトル */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            メール作成
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            健康データをまとめたメールを作成できます
          </p>
        </div>

        {/* 説明カード */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-center">
            <div className="text-left max-w-md">
              <ul className="list-disc list-inside space-y-1">
                <li>メーラーアプリが起動するので、そこから送信してください</li>
                <li>個人情報とデータサマリーを本文に含めることができます</li>
                <li>
                  グラフのスクリーンショットを添付して詳細データを共有できます
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* メール情報 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          {/* 差出人情報セクション */}
          <div className="mb-6 space-y-4">
            {/* 氏名 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label
                htmlFor="senderName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
              >
                氏名
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  id="senderName"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
                {goalData?.name && !senderName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    目標ページ: {goalData.name}
                  </p>
                )}
              </div>
            </div>

            {/* 連絡先 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label
                htmlFor="senderContact"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
              >
                連絡先
              </label>
              <input
                type="text"
                id="senderContact"
                value={senderContact}
                onChange={e => setSenderContact(e.target.value)}
                placeholder="電話番号やメールアドレスなど"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* メール送信情報セクション */}
          <div className="space-y-4">
            {/* 宛先 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label
                htmlFor="recipient"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
              >
                宛先
              </label>
              <input
                type="email"
                id="recipient"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="example@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 件名 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label
                htmlFor="subject"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit"
              >
                件名
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* データが無い場合の警告 */}
          {!goalData?.targetWeight && (
            <StatusMessage
              type="info"
              message="目標体重が設定されていません。"
            />
          )}
        </div>

        {/* 体重データ週次サマリー表示 */}
        {weeklySummaries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
              体重データ 週次サマリー
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      期間
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      最高
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      最低
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      記録数
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {weeklySummaries.map((summary) => {
                    const startDate = new Date(summary.weekStart);
                    const endDate = new Date(summary.weekEnd);
                    const formatDate = (date: Date) => {
                      const month = date.getMonth() + 1;
                      const day = date.getDate();
                      return `${month}/${day}`;
                    };

                    return (
                      <tr key={summary.weekStart}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          第{summary.weekNum}週
                          <br />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(startDate)}～{formatDate(endDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                          {summary.maxWeight.toFixed(1)}kg
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                          {summary.minWeight.toFixed(1)}kg
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {summary.recordCount}件
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              ※ 過去1ヶ月間のデータを週単位で集計しています
            </p>
          </div>
        )}

        {/* 生活習慣目標の達成状況 */}
        {(() => {
          const achievementRates = calculateLifestyleAchievementRate();
          return achievementRates.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
                生活習慣目標の達成状況
              </h2>
              <div className="space-y-3">
                {achievementRates.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.fieldName}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.rate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white min-w-[60px] text-right">
                        {item.rate}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px]">
                        ({item.total}日間)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                ※ 過去1ヶ月間の記録から計算しています
              </p>
            </div>
          ) : null;
        })()}

        {/* プレビュー */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
            本文プレビュー
          </h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono text-left">
              {previewBody}
            </pre>
          </div>
        </div>

        {/* スクリーンショットガイド */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <button
            onClick={() => setShowScreenshotGuide(!showScreenshotGuide)}
            className="w-full flex items-center justify-center text-center"
          >
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <FaCamera className="text-green-600" />
              グラフのスクリーンショット取得方法
              <span className="text-2xl text-gray-400 ml-2">
                {showScreenshotGuide ? '−' : '+'}
              </span>
            </h2>
          </button>

          {showScreenshotGuide && (
            <div className="mt-4 space-y-4">
              {/* Windows */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  📱 Windows
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>グラフページを開く</li>
                  <li>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      Win
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      Shift
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      S
                    </kbd>{' '}
                    を押す
                  </li>
                  <li>画面の切り取りたい範囲をドラッグして選択</li>
                  <li>クリップボードに保存されるので、メールに貼り付け</li>
                </ol>
              </div>

              {/* macOS */}
              <div className="border-l-4 border-gray-500 pl-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  🍎 macOS
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>グラフページを開く</li>
                  <li>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      Cmd
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      Shift
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      4
                    </kbd>{' '}
                    を押す
                  </li>
                  <li>画面の切り取りたい範囲をドラッグして選択</li>
                  <li>デスクトップに画像ファイルが保存される</li>
                </ol>
              </div>

              {/* Android */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  🤖 Android
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>グラフページを開く</li>
                  <li>
                    電源ボタンと音量下げボタンを同時に長押し（機種により異なる）
                  </li>
                  <li>スクリーンショットが保存される</li>
                  <li>ギャラリーから画像を選んでメールに添付</li>
                </ol>
              </div>

              {/* iOS */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  📱 iOS (iPhone/iPad)
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>グラフページを開く</li>
                  <li>
                    <strong>Face ID搭載機:</strong>{' '}
                    サイドボタンと音量上げボタンを同時押し
                  </li>
                  <li>
                    <strong>ホームボタン搭載機:</strong>{' '}
                    ホームボタンとサイドボタンを同時押し
                  </li>
                  <li>スクリーンショットが保存される</li>
                  <li>写真アプリから画像を選んでメールに添付</li>
                </ol>
              </div>

              {/* ヒント */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>💡 ヒント:</strong>{' '}
                  グラフページで期間を切り替えて、複数のスクリーンショットを撮影すると、より詳細なデータを共有できます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* メーラー起動ボタン */}
        <div className="flex flex-col gap-4">
          {!canSendMail && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>⚠️ メール送信前の確認</strong>
                <br />
                氏名を入力してください（必須）。
              </p>
            </div>
          )}
          <Button
            onClick={handleOpenMailer}
            variant="primary"
            className={`flex-1 py-3 text-lg ${
              !canSendMail
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-600'
            }`}
            disabled={!canSendMail}
          >
            <FaEnvelope className="inline mr-2" />
            メーラーを起動
          </Button>
        </div>

        {/* 補足説明 */}
        <div className="mt-6 flex justify-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left max-w-md">
            <p>
              ※
              メーラーアプリが起動します。必要に応じてグラフのスクリーンショットを添付してから送信してください。
            </p>
            <p>
              ※
              メーラーが起動しない場合は、お使いのデバイスにメールアプリが設定されているかご確認ください。
            </p>
            {!senderName.trim() && !goalData?.name && (
              <p className="text-red-600 dark:text-red-400">
                ※ <strong>氏名は必須です。</strong>
                差出人情報に入力してください。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MailCompose;
