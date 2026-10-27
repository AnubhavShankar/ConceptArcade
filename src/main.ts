import './styles.css';
import { startApp } from './core/app';
import { applyTheme } from './core/theme';

applyTheme();
startApp(document.getElementById('app')!);
