import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
}

export interface ActionMenuProps {
  items: (ActionMenuItem | null | undefined | false)[];
  buttonClassName?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  menuWidth?: number;
  label?: string; // Accessible aria-label
  size?: 'sm' | 'md';
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  buttonClassName = '',
  icon,
  align = 'right',
  menuWidth = 190,
  label = 'Actions menu',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [menuStyle, setMenuStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({
    left: 0,
    width: menuWidth,
    maxHeight: 320,
  });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Filter visible items
  const validItems = React.useMemo(() => {
    return items.filter(
      (item): item is ActionMenuItem => Boolean(item && typeof item === 'object' && !item.hidden)
    );
  }, [items]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // If button scrolled off screen, close
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const approxHeight = validItems.length * 42 + 16;

    let openUpward = false;
    let availableHeight = Math.min(320, viewportHeight - 16);

    if (spaceBelow < approxHeight && spaceAbove > spaceBelow) {
      openUpward = true;
      availableHeight = Math.min(320, Math.max(100, spaceAbove - 8));
    } else {
      openUpward = false;
      availableHeight = Math.min(320, Math.max(100, spaceBelow - 8));
    }

    // Horizontal positioning
    let leftPos =
      align === 'right'
        ? rect.right - menuWidth
        : rect.left;

    // Clamp inside viewport
    leftPos = Math.max(8, Math.min(leftPos, viewportWidth - menuWidth - 8));

    if (openUpward) {
      setMenuStyle({
        bottom: viewportHeight - rect.top + 4,
        left: leftPos,
        width: menuWidth,
        maxHeight: availableHeight,
      });
    } else {
      setMenuStyle({
        top: rect.bottom + 4,
        left: leftPos,
        width: menuWidth,
        maxHeight: availableHeight,
      });
    }
  }, [align, menuWidth, validItems.length]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setActiveIndex(-1);
    }
    setIsOpen(!isOpen);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const insideBtn = buttonRef.current && buttonRef.current.contains(target);
      const insideMenu = menuRef.current && menuRef.current.contains(target);

      if (!insideBtn && !insideMenu) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, handleClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          updatePosition();
          setIsOpen(true);
        } else if (activeIndex >= 0 && activeIndex < validItems.length) {
          e.preventDefault();
          const item = validItems[activeIndex];
          if (!item.disabled) {
            handleClose();
            item.onClick();
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          updatePosition();
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((prev) => (prev + 1 < validItems.length ? prev + 1 : 0));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          updatePosition();
          setIsOpen(true);
          setActiveIndex(validItems.length - 1);
        } else {
          setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : validItems.length - 1));
        }
        break;

      case 'Escape':
        e.preventDefault();
        handleClose();
        buttonRef.current?.focus();
        break;

      case 'Tab':
        handleClose();
        break;

      default:
        break;
    }
  };

  const btnPadding = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 inline-flex items-center justify-center cursor-pointer ${btnPadding} ${buttonClassName}`}
      >
        {icon || <MoreVertical className={size === 'sm' ? 'w-4 h-4' : 'w-4 h-4'} />}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuStyle.top !== undefined ? `${menuStyle.top}px` : undefined,
              bottom:
                menuStyle.bottom !== undefined ? `${menuStyle.bottom}px` : undefined,
              left: `${menuStyle.left}px`,
              width: `${menuStyle.width}px`,
              maxHeight: `${menuStyle.maxHeight}px`,
              zIndex: 99999,
            }}
            role="menu"
            aria-label={label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 overflow-y-auto flex flex-col backdrop-blur-md animate-fadeIn"
          >
            {validItems.map((item, idx) => {
              const isHighlighted = idx === activeIndex;

              return (
                <button
                  key={`${item.label}-${idx}`}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    handleClose();
                    item.onClick();
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-auto text-left flex items-center space-x-2.5 px-3 py-2 mx-1 rounded-xl text-xs font-semibold transition-colors select-none ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : item.danger
                      ? isHighlighted
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon && (
                    <span
                      className={`w-4 h-4 flex-shrink-0 ${
                        item.danger
                          ? 'text-rose-500'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
