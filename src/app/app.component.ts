import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { stime } from '@thegraid/common-lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  timestamp = `${new Date().toLocaleTimeString('en-US')}`;
  linkUrl = 'https://docs.google.com/document/d/1Am5Q30z0M__ZcIIbcLeaeW91F9lXQK1aFMDNSkji-nI/view';
  linkName!: string;

  constructor(private titleService: Title) {
    console.log(stime(this, `.AppComponent`), this.titleService)
    this.linkName = `${this.titleService?.getTitle()} - User Guide`;
  }
}
