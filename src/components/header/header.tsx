import { AppImage } from "@shared/components/app-image";
import { createStyles, getUniqueAndSorted } from "@utils/";
import {
  PART_CATEGORY_NAMES,
  PART_CATEGORY_ORDER,
  VEHICLE_CATEGORY_NAMES,
  VEHICLE_CATEGORY_ORDER,
} from "@/constants/";
import { NAVIGATION_ITEMS, THEME, THEME_STORAGE_KEY, ThemeType } from "@/constants";
import { useVehicles, useParts } from "@/hooks";
import {
  CircleUserRound,
  Heart,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import style from "./scss/header.module.scss";

export const Header: React.FC = () => {
  const location = useLocation();

  // Отримуємо дані та стейт завантаження напряму через React Query
  const { data: vehicles = [] } = useVehicles();
  const { data: parts = [] } = useParts();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // Стейт для меню, яке зафіксували кліком ("прикріпили")
  const [pinnedDropdown, setPinnedDropdown] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Очищення таймера при розмонтуванні компонента
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Закриття і зняття фіксації при кліку поза межами хедера
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setPinnedDropdown(null);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Закриття по клавіші Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setPinnedDropdown(null);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Оптимізовано через універсальну функцію
  const uniqueCategories = getUniqueAndSorted(vehicles, (v) => v.category, VEHICLE_CATEGORY_ORDER);
  const uniquePartCategories = getUniqueAndSorted(parts, (p) => p.subCategory, PART_CATEGORY_ORDER);

  // Хелпер для отримання пунктів випадаючого списку
  const getDropdownItems = (item: (typeof NAVIGATION_ITEMS)[number]) => {
    if (item.dynamicSource === "vehicles") {
      return uniqueCategories.map((catKey) => ({
        label: VEHICLE_CATEGORY_NAMES[catKey] || catKey,
        to: `/vehicles/${catKey}`,
      }));
    }
    if (item.dynamicSource === "parts") {
      return uniquePartCategories.map((catKey) => ({
        label: PART_CATEGORY_NAMES[catKey] || catKey,
        to: `/parts/${catKey}`,
      }));
    }
    return item.children;
  };

  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeType) || THEME.SYSTEM;
    }
    return THEME.SYSTEM;
  });

  useEffect(() => {
    const body = document.body;
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const applyTheme = () => {
      if (theme === THEME.DARK) {
        body.classList.add("dark");
      } else if (theme === THEME.LIGHT) {
        body.classList.remove("dark");
        if (body.classList.length === 0) {
          body.removeAttribute("class");
        }
      } else if (theme === THEME.SYSTEM) {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isSystemDark) {
          body.classList.add("dark");
        } else {
          body.classList.remove("dark");
          if (body.classList.length === 0) {
            body.removeAttribute("class");
          }
        }
      }
    };

    applyTheme();

    if (theme === THEME.SYSTEM) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const getActiveClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${style.menu__link} ${style["menu__link--active"]}` : style.menu__link;

  const getDropdownActiveClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${style["dropdown-link"]} ${style["dropdown-link--active"]}` : style["dropdown-link"];

  const s = createStyles(style);

  // Наведення мишки (десктоп)
  const handleMouseEnter = (dropdownKey: string) => {
    if (!isMenuOpen && window.innerWidth > 950) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      // Відкриваємо по ховеру тільки якщо жодне меню зараз не зафіксоване кліком
      if (!pinnedDropdown) {
        setActiveDropdown(dropdownKey);
      }
    }
  };

  // Відведення мишки (десктоп)
  const handleMouseLeave = (dropdownKey: string) => {
    if (!isMenuOpen && window.innerWidth > 950) {
      // Якщо це меню зафіксоване кліком — ігноруємо відведення мишки
      if (pinnedDropdown === dropdownKey) return;

      closeTimeoutRef.current = setTimeout(() => {
        setActiveDropdown(null);
      }, 120);
    }
  };

  // Клік по кнопці випадаючого меню (фіксація / зняття фіксації)
  const handleDropdownClick = (dropdownKey: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (pinnedDropdown === dropdownKey) {
      // Якщо вже було зафіксоване — відкріплюємо і закриваємо
      setPinnedDropdown(null);
      setActiveDropdown(null);
    } else {
      // Якщо відкрито по ховеру або закрито — фіксуємо відкритим
      setPinnedDropdown(dropdownKey);
      setActiveDropdown(dropdownKey);
    }
  };

  const handleToggleMobileMenu = () => {
    const nextMenuState = !isMenuOpen;
    setIsMenuOpen(nextMenuState);
    setPinnedDropdown(null);

    if (nextMenuState) {
      const activeSection = NAVIGATION_ITEMS.find((item) => {
        if (!item.key && !item.label) return false;
        const dropdownItems = getDropdownItems(item);
        return dropdownItems?.some((child) => location.pathname.startsWith(child.to));
      });

      const keyToOpen = activeSection ? activeSection.key || activeSection.label : null;
      setActiveDropdown(keyToOpen);
      setPinnedDropdown(keyToOpen);
    } else {
      setActiveDropdown(null);
    }
  };

  const closeAllMenus = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsMenuOpen(false);
    setActiveDropdown(null);
    setPinnedDropdown(null);
  };

  return (
    <header className={s("header")} ref={headerRef}>
      <div className="container">
        <div className={s("header__inner")}>
          <a className={s("logo")} href="/">
            <AppImage
              className={s("logo__picture")}
              src={"assets/images/logo.svg"}
              alt={"logo"}
            />
          </a>

          <nav className={s("menu")}>
            <button
              className={s("menu__btn")}
              onClick={handleToggleMobileMenu}
              type="button"
              aria-label="Меню"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <ul className={`${s("menu__list")} ${isMenuOpen ? s("menu__list--open") : ""}`}>
              {NAVIGATION_ITEMS.map((item, index) => {
                if (item.to && !item.children && !item.dynamicSource) {
                  return (
                    <li className={s("menu__item")} key={index}>
                      <NavLink
                        end={item.to === "/"}
                        className={getActiveClass}
                        to={item.to}
                        onClick={closeAllMenus}
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  );
                }

                const dropdownKey = item.key || item.label;
                const isDropdownOpen =
                  activeDropdown === dropdownKey || pinnedDropdown === dropdownKey;

                const isItemActive =
                  (item.basePath && location.pathname.startsWith(item.basePath)) ||
                  (item.to && location.pathname.startsWith(item.to));

                const dropdownItems = getDropdownItems(item);

                return (
                  <li
                    className={s("menu__item")}
                    key={index}
                    onMouseEnter={() => handleMouseEnter(dropdownKey)}
                    onMouseLeave={() => handleMouseLeave(dropdownKey)}
                  >
                    <button
                      className={`${s("menu__dropdown-toggle")} ${
                        isItemActive ? s("menu__link--active") : ""
                      } ${isDropdownOpen ? s("menu__dropdown-toggle--open") : ""}`}
                      onClick={() => handleDropdownClick(dropdownKey)}
                      type="button"
                      aria-expanded={isDropdownOpen}
                    >
                      {item.label}
                      <span className={`${s("arrow")} ${isDropdownOpen ? s("open") : ""}`} />
                    </button>

                    <div
                      className={`${s("menu__dropdown")} ${
                        isDropdownOpen ? s("menu__dropdown--open") : ""
                      }`}
                    >
                      {dropdownItems?.map((child, childIdx) => (
                        <NavLink
                          key={childIdx}
                          to={child.to}
                          className={getDropdownActiveClass}
                          onClick={closeAllMenus}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <ul className={s("actions")}>
            <li className={s("actions__item")}>
              <a href="#" className={s("actions__link")} title="Логін">
                <CircleUserRound className={s("actions__icon")} size={24} />
              </a>
            </li>
            <li className={s("actions__item")}>
              <a href="#" className={s("actions__link")} title="Пошук">
                <Search className={s("actions__icon")} size={24} />
              </a>
            </li>
            <li className={s("actions__item")}>
              <a href="#" className={s("actions__link")} title="Обрані">
                <Heart className={s("actions__icon")} size={24} />
              </a>
            </li>
            <li
              className={`${s("actions__item")} ${
                activeDropdown === "theme" ? s("actions__item--open") : ""
              }`}
            >
              <button
                className={s("theme-toggle")}
                title="Змінити тему"
                onClick={() => {
                  setIsMenuOpen(false);
                  setPinnedDropdown(null);
                  setActiveDropdown((prev) => (prev === "theme" ? null : "theme"));
                }}
                type="button"
                aria-expanded={activeDropdown === "theme"}
              >
                {theme === THEME.LIGHT ? (
                  <Sun className={s("actions__icon")} size={24} />
                ) : theme === THEME.DARK ? (
                  <Moon className={s("actions__icon")} size={24} />
                ) : (
                  <Monitor className={s("actions__icon")} size={24} />
                )}
              </button>

              {activeDropdown === "theme" && (
                <div className={s("theme-toggle__popup")}>
                  <button
                    className={`${s("theme-toggle__option")} ${
                      theme === THEME.LIGHT ? s("theme-toggle__option--active") : ""
                    }`}
                    onClick={() => {
                      setTheme(THEME.LIGHT);
                      setActiveDropdown(null);
                    }}
                    type="button"
                    title="Світла тема"
                  >
                    <Sun size={24} />
                  </button>
                  <button
                    className={`${s("theme-toggle__option")} ${
                      theme === THEME.DARK ? s("theme-toggle__option--active") : ""
                    }`}
                    onClick={() => {
                      setTheme(THEME.DARK);
                      setActiveDropdown(null);
                    }}
                    type="button"
                    title="Темна тема"
                  >
                    <Moon size={24} />
                  </button>
                  <button
                    className={`${s("theme-toggle__option")} ${
                      theme === THEME.SYSTEM ? s("theme-toggle__option--active") : ""
                    }`}
                    onClick={() => {
                      setTheme(THEME.SYSTEM);
                      setActiveDropdown(null);
                    }}
                    type="button"
                    title="Системна тема"
                  >
                    <Monitor size={24} />
                  </button>
                </div>
              )}
            </li>
          </ul>

          <button className={s("header__add")} type="button">
            <Plus className={s("header__add-icon")} size={20} />
            <span>Додати оголошення</span>
          </button>
        </div>
      </div>
    </header>
  );
};
