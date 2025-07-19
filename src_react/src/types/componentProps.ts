// 共通コンポーネントプロップスの型定義

// 基本的なコンポーネントプロップス
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
}

// フォームフィールドの基本プロップス
export interface FormFieldProps extends BaseComponentProps {
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
}

// ボタンのバリアント
export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

// ボタンプロップス
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<Record<string, unknown>>;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

// インプットプロップス
export interface InputProps extends FormFieldProps {
  type?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// モーダルプロップス
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

// プログレスバープロップス
export interface ProgressBarProps extends BaseComponentProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}

// カードプロップス
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  bordered?: boolean;
}

// ステータスメッセージプロップス
export interface StatusMessageProps extends BaseComponentProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
  onDismiss?: () => void;
}

// データテーブルプロップス
export interface DataTableProps<T = Record<string, unknown>> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
}

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T;
  title: string;
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

// 日付選択プロップス
export interface DatePickerProps extends FormFieldProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  format?: string;
}

// 数値入力プロップス
export interface NumberInputProps extends FormFieldProps {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// タブプロップス
export interface TabsProps extends BaseComponentProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: TabItem[];
}

export interface TabItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

// ドロップダウンプロップス
export interface DropdownProps extends FormFieldProps {
  options: DropdownOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  multiple?: boolean;
  searchable?: boolean;
}

export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

// アイコンプロップス
export interface IconProps extends BaseComponentProps {
  name?: string;
  size?: number | string;
  color?: string;
  onClick?: () => void;
}

// ローダープロップス
export interface LoaderProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  overlay?: boolean;
  text?: string;
}

// トーストプロップス
export interface ToastProps extends BaseComponentProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  onClose?: () => void;
}

// 複合コンポーネント用のプロップス
export interface RecordFormProps<T = Record<string, unknown>> extends BaseComponentProps {
  data?: T;
  onSave: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  validationSchema?: unknown;
}

export interface DataVisualizationProps extends BaseComponentProps {
  data: Record<string, unknown>[];
  type: 'line' | 'bar' | 'pie' | 'area';
  xAxisKey?: string;
  yAxisKey?: string;
  title?: string;
  height?: number;
  responsive?: boolean;
}