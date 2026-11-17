import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@layouts/";
import { useSvgSprite } from '@hooks/';
import {Home, NotFound} from "@/pages";

export default function App() {
  useSvgSprite();

  return (
    <Routes>
      {/* Жодних пропсів vehicles та parts! Лейаут самостійно розбереться з даними */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
