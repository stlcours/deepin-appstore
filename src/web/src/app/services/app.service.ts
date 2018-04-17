import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as _ from 'lodash';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';

import { BaseService } from '../dstore/services/base.service';
import { AppService as DstoreAppService } from '../dstore/services/app.service';
import { App } from '../dstore/services/app';

@Injectable()
export class AppService {
  private server: string;
  private _list: Observable<App[]>;

  constructor(
    private http: HttpClient,
    private appService: DstoreAppService,
    private baseService: BaseService
  ) {
    this.server = this.baseService.serverHosts.operationServer;
    this._list = this.getList().shareReplay();
  }

  get list() : Observable<App[]> {
    return this._list;
  }

  getApp(appName: string): Observable<App> {
    return this.list
      .map(apps => apps.find(app => app.name === appName))
      .do(app => console.log(app));
  }

  private getList() {
    interface AppStat {
      downloadCount: { appName: string; count: number }[];
      rate: { appName: string; rate: number; count: number }[];
    }
    return this.http
      .get(`${this.server}/api/app`)
      .flatMap((resp: { apps: string[] }) => {
        return this.appService
          .getAppList()
          .map(appList => appList.filter(app => resp.apps.includes(app.name)));
      })
      .flatMap((apps: DstoreApp[]) =>
        this.http.get(`${this.server}/api/appstat`).map((stat: AppStat) => {
          const downloadsDict = _.keyBy(stat.downloadCount, 'appName');
          const rateDict = _.keyBy(stat.rate, 'appName');
          apps.forEach(app => {
            app.downloads = _.get(
              downloadsDict,
              [app.name, 'count'],
              0
            ) as number;
            app.rate = (_.get(rateDict, [app.name, 'rate'], 0) as number) / 2;
            app.ratings = _.get(rateDict, [app.name, 'count'], 0) as number;
          });
          return apps;
        })
      );
  }
}

export class DstoreApp extends App {
  downloads = 0;
  rate = 0;
  ratings = 0;
}
