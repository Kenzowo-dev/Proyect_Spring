import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { App } from './app/app';
import { apiAuthInterceptor } from './app/auth';
import { routes } from './app/routes';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([apiAuthInterceptor])),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
  ],
}).catch(error => console.error(error));
