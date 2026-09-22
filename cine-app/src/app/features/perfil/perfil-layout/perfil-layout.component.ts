import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-perfil-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './perfil-layout.component.html',
    styleUrls: ['./perfil-layout.component.css']
})
export class PerfilLayoutComponent { }