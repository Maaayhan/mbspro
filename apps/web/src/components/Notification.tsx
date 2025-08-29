import { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface NotificationProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function Notification({
  type,
  title,
  message,
  isOpen,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // 等待动画完成
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case "info":
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      default:
        return null;
    }
  };

  const getContainerClasses = () => {
    const baseClasses =
      "fixed top-4 right-4 max-w-md transform transition-all duration-200 ease-in-out z-50";

    if (!isOpen) return `${baseClasses} translate-x-full opacity-0`;
    if (!isVisible) return `${baseClasses} translate-x-full opacity-0`;

    return `${baseClasses} translate-x-0 opacity-100`;
  };

  const getBackgroundClasses = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className={getContainerClasses()}>
      <div className={`rounded-lg border shadow-lg ${getBackgroundClasses()}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div className="ml-3 flex-1 min-w-0">
              <h3 className="text-sm font-medium">{title}</h3>
              {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  type === "success"
                    ? "text-green-400 hover:text-green-500 focus:ring-green-500"
                    : type === "error"
                    ? "text-red-400 hover:text-red-500 focus:ring-red-500"
                    : type === "warning"
                    ? "text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500"
                    : "text-blue-400 hover:text-blue-500 focus:ring-blue-500"
                }`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-close */}
        {autoClose && (
          <div className="h-1 bg-current opacity-20">
            <div
              className="h-full bg-current transition-all duration-200 ease-linear"
              style={{
                width: isVisible ? "0%" : "100%",
                transitionDuration: `${autoCloseDelay}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
