import type { GoalData } from '../../types/goal';
import { STORE_NAMES } from '../config';
import { trackDbOperation } from '../performance';
import { executeTransaction } from '../connection';

/**
 * 目標データの操作結果
 */
export interface GoalOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 目標達成の統計情報
 */
export interface GoalStats {
  hasGoal: boolean;
  targetWeight?: number;
  currentWeight?: number;
  remainingWeight?: number;
  progressPercentage: number;
  isGoalAchieved: boolean;
  daysToTarget?: number;
  estimatedCompletionDate?: string;
}

/**
 * 目標データ専用リポジトリ
 * シングルトンパターンで目標データを管理
 */
export class GoalRepository {
  private static instance: GoalRepository;
  private readonly storeName = STORE_NAMES.GOAL;
  private readonly GOAL_ID = 'singleton'; // 目標データは常に単一

  private constructor() {}

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): GoalRepository {
    if (!GoalRepository.instance) {
      GoalRepository.instance = new GoalRepository();
    }
    return GoalRepository.instance;
  }

  /**
   * 目標データの保存
   */
  async setGoal(goal: GoalData): Promise<GoalOperationResult<GoalData>> {
    return trackDbOperation('set-goal', async () => {
      try {
        // バリデーション
        const validationError = this.validateGoalData(goal);
        if (validationError) {
          return {
            success: false,
            error: validationError,
          };
        }

        await executeTransaction(
          this.storeName,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const goalWithId = { ...goal, id: this.GOAL_ID };
              const request = objectStore.put(goalWithId);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return {
          success: true,
          data: goal,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * 目標データの取得
   */
  async getGoal(): Promise<GoalOperationResult<GoalData>> {
    return trackDbOperation('get-goal', async () => {
      try {
        const result = await executeTransaction(
          this.storeName,
          'readonly',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<any>((resolve, reject) => {
              const request = objectStore.get(this.GOAL_ID);
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }
        );

        if (!result) {
          return {
            success: false,
            error: 'Goal not found',
          };
        }

        // idを除外して返す
        const { id: _id, ...goal } = result;
        return {
          success: true,
          data: goal as GoalData,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * 目標データの存在確認
   */
  async hasGoal(): Promise<boolean> {
    try {
      const result = await this.getGoal();
      return result.success && !!result.data;
    } catch {
      return false;
    }
  }

  /**
   * 目標データの削除
   */
  async clearGoal(): Promise<GoalOperationResult<void>> {
    return trackDbOperation('clear-goal', async () => {
      try {
        await executeTransaction(
          this.storeName,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = objectStore.delete(this.GOAL_ID);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * 目標達成の進捗統計を取得
   */
  async getGoalProgress(currentWeight?: number): Promise<GoalOperationResult<GoalStats>> {
    return trackDbOperation('get-goal-progress', async () => {
      try {
        const goalResult = await this.getGoal();
        
        if (!goalResult.success || !goalResult.data) {
          return {
            success: true,
            data: {
              hasGoal: false,
              progressPercentage: 0,
              isGoalAchieved: false,
            },
          };
        }

        const goal = goalResult.data;
        
        // 現在の体重が提供されていない場合は基本情報のみ返す
        if (currentWeight === undefined) {
          return {
            success: true,
            data: {
              hasGoal: true,
              targetWeight: goal.targetWeight,
              progressPercentage: 0,
              isGoalAchieved: false,
            },
          };
        }

        // 進捗計算
        const startWeight = goal.currentWeight || currentWeight;
        const targetWeight = goal.targetWeight;
        const remainingWeight = Math.abs(currentWeight - targetWeight);
        
        // 進捗率の計算（減量の場合と増量の場合で計算が異なる）
        let progressPercentage = 0;
        const isWeightLoss = startWeight > targetWeight;
        
        if (isWeightLoss) {
          // 減量の場合
          const totalToLose = startWeight - targetWeight;
          const alreadyLost = startWeight - currentWeight;
          progressPercentage = totalToLose > 0 ? (alreadyLost / totalToLose) * 100 : 0;
        } else {
          // 増量の場合
          const totalToGain = targetWeight - startWeight;
          const alreadyGained = currentWeight - startWeight;
          progressPercentage = totalToGain > 0 ? (alreadyGained / totalToGain) * 100 : 0;
        }

        // 進捗率を0-100の範囲に制限
        progressPercentage = Math.max(0, Math.min(100, progressPercentage));

        // 目標達成判定（±0.5kgの範囲内で達成とみなす）
        const isGoalAchieved = remainingWeight <= 0.5;

        // 目標達成予定日の計算（簡易的な線形予測）
        let estimatedCompletionDate: string | undefined;
        let daysToTarget: number | undefined;

        if (!isGoalAchieved && goal.targetDate) {
          const targetDate = new Date(goal.targetDate);
          const today = new Date();
          daysToTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysToTarget > 0) {
            estimatedCompletionDate = goal.targetDate;
          }
        }

        return {
          success: true,
          data: {
            hasGoal: true,
            targetWeight,
            currentWeight,
            remainingWeight,
            progressPercentage,
            isGoalAchieved,
            daysToTarget,
            estimatedCompletionDate,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * 目標データのバリデーション
   */
  private validateGoalData(goal: GoalData): string | null {
    if (!goal.targetWeight || goal.targetWeight <= 0) {
      return '目標体重が正しく設定されていません';
    }

    if (goal.targetWeight < 20 || goal.targetWeight > 300) {
      return '目標体重は20kg〜300kgの範囲で設定してください';
    }

    if (goal.currentWeight && (goal.currentWeight < 20 || goal.currentWeight > 300)) {
      return '現在の体重は20kg〜300kgの範囲で設定してください';
    }

    if (goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const today = new Date();
      
      if (targetDate <= today) {
        return '目標日は今日より後の日付を設定してください';
      }

      // 1年以上先の日付は警告
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      if (targetDate > oneYearLater) {
        return '目標日は1年以内の日付を推奨します';
      }
    }

    return null;
  }

  /**
   * 目標の妥当性チェック（健康的な目標設定かどうか）
   */
  async validateGoalHealth(goal: GoalData): Promise<{
    isHealthy: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (goal.currentWeight && goal.targetWeight) {
      const weightDifference = Math.abs(goal.currentWeight - goal.targetWeight);
      const isWeightLoss = goal.currentWeight > goal.targetWeight;

      // 極端な体重変化のチェック
      if (weightDifference > 20) {
        warnings.push('20kg以上の体重変化は健康に影響を与える可能性があります');
        recommendations.push('段階的な目標設定を検討してください');
      }

      // 期間のチェック
      if (goal.targetDate) {
        const daysToTarget = Math.ceil(
          (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysToTarget > 0) {
          const weeklyChangeRate = (weightDifference / daysToTarget) * 7;
          
          if (isWeightLoss && weeklyChangeRate > 1) {
            warnings.push('週1kg以上の減量は健康に負担をかける可能性があります');
            recommendations.push('週0.5kg程度の減量を目安にしてください');
          } else if (!isWeightLoss && weeklyChangeRate > 0.5) {
            warnings.push('急激な体重増加は健康に影響する可能性があります');
            recommendations.push('週0.25kg程度の増量を目安にしてください');
          }
        }
      }

      // BMI の妥当性チェック（身長が設定されている場合）
      if (goal.height && goal.height > 0) {
        const heightInM = goal.height / 100;
        const targetBMI = goal.targetWeight / (heightInM * heightInM);
        
        if (targetBMI < 18.5) {
          warnings.push('目標BMIが低体重の範囲です');
          recommendations.push('健康的な体重範囲での目標設定を検討してください');
        } else if (targetBMI > 25) {
          warnings.push('目標BMIが標準範囲を超えています');
          recommendations.push('健康的な体重範囲での目標設定を検討してください');
        }
      }
    }

    const isHealthy = warnings.length === 0;

    return {
      isHealthy,
      warnings,
      recommendations,
    };
  }
}

// シングルトンインスタンス
export const goalRepository = GoalRepository.getInstance();